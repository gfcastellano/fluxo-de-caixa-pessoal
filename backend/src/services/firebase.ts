import type { Env } from '../types/context';

const FIREBASE_REST_API = 'https://firestore.googleapis.com/v1';

export class FirebaseService {
  private projectId: string;
  private apiKey: string;

  constructor(env: Env) {
    this.projectId = env.FIREBASE_PROJECT_ID;
    this.apiKey = env.FIREBASE_API_KEY;
  }

  private getBaseUrl(): string {
    return `${FIREBASE_REST_API}/projects/${this.projectId}/databases/(default)/documents`;
  }

  async getDocuments(
    collection: string,
    userId: string
  ): Promise<unknown[]> {
    const url = `${this.getBaseUrl()}/${collection}?key=${this.apiKey}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch documents: ${response.statusText}`);
    }

    const data = await response.json() as { documents?: Array<{ name: string; fields?: Record<string, unknown> }> };
    const documents = data.documents || [];

    // Filter by userId
    return documents
      .filter((doc) =>
        (doc.fields?.userId as { stringValue?: string })?.stringValue === userId
      )
      .map((doc) =>
        this.convertFromFirestore(doc)
      );
  }

  async createDocument(
    collection: string,
    data: Record<string, unknown>
  ): Promise<unknown> {
    const url = `${this.getBaseUrl()}/${collection}?key=${this.apiKey}`;

    const firestoreData = this.convertToFirestore(data);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: firestoreData }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create document: ${response.statusText}`);
    }

    const result = await response.json() as { name: string; fields?: Record<string, unknown> };
    return this.convertFromFirestore(result);
  }

  async updateDocument(
    collection: string,
    documentId: string,
    data: Record<string, unknown>
  ): Promise<void> {
    const url = `${this.getBaseUrl()}/${collection}/${documentId}?key=${this.apiKey}`;

    console.log('Firebase updateDocument - URL:', url);
    console.log('Firebase updateDocument - Raw data:', JSON.stringify(data, null, 2));

    const firestoreData = this.convertToFirestore(data);
    console.log('Firebase updateDocument - Firestore formatted data:', JSON.stringify(firestoreData, null, 2));

    const requestBody = JSON.stringify({ fields: firestoreData });
    console.log('Firebase updateDocument - Request body:', requestBody);

    const response = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: requestBody,
    });

    console.log('Firebase updateDocument - Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Firebase updateDocument - Error response:', errorText);
      throw new Error(`Failed to update document: ${response.statusText} - ${errorText}`);
    }
    
    const responseData = await response.json();
    console.log('Firebase updateDocument - Success response:', JSON.stringify(responseData, null, 2));
  }

  async deleteDocument(collection: string, documentId: string): Promise<void> {
    const url = `${this.getBaseUrl()}/${collection}/${documentId}?key=${this.apiKey}`;

    const response = await fetch(url, { method: 'DELETE' });

    if (!response.ok) {
      throw new Error(`Failed to delete document: ${response.statusText}`);
    }
  }

  private convertToFirestore(
    data: Record<string, unknown>
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data)) {
      if (value === null) {
        result[key] = { nullValue: null };
      } else if (typeof value === 'string') {
        result[key] = { stringValue: value };
      } else if (typeof value === 'number') {
        result[key] = { doubleValue: value };
      } else if (typeof value === 'boolean') {
        result[key] = { booleanValue: value };
      } else if (value instanceof Date) {
        result[key] = { timestampValue: value.toISOString() };
      } else if (Array.isArray(value)) {
        result[key] = {
          arrayValue: {
            values: value.map((v) => this.convertToFirestore({ v }).v),
          },
        };
      } else if (typeof value === 'object') {
        result[key] = { mapValue: { fields: this.convertToFirestore(value as Record<string, unknown>) } };
      }
    }

    return result;
  }

  private convertFromFirestore(doc: {
    name: string;
    fields?: Record<string, unknown>;
  }): Record<string, unknown> {
    const id = doc.name.split('/').pop() || '';
    const result: Record<string, unknown> = { id };

    if (!doc.fields) return result;

    for (const [key, value] of Object.entries(doc.fields)) {
      result[key] = this.parseFirestoreValue(value);
    }

    return result;
  }

  private parseFirestoreValue(value: unknown): unknown {
    if (!value || typeof value !== 'object') return value;

    const v = value as Record<string, unknown>;

    if ('stringValue' in v) return v.stringValue;
    if ('doubleValue' in v) return v.doubleValue;
    if ('integerValue' in v) return parseInt(v.integerValue as string, 10);
    if ('booleanValue' in v) return v.booleanValue;
    if ('timestampValue' in v) return v.timestampValue;
    if ('nullValue' in v) return null;
    if ('mapValue' in v && v.mapValue && typeof v.mapValue === 'object') {
      const mapValue = v.mapValue as { fields?: Record<string, unknown> };
      return mapValue.fields
        ? this.convertFromFirestore({ name: '', fields: mapValue.fields })
        : {};
    }
    if ('arrayValue' in v && v.arrayValue && typeof v.arrayValue === 'object') {
      const arrayValue = v.arrayValue as { values?: unknown[] };
      return arrayValue.values
        ? arrayValue.values.map((item) => this.parseFirestoreValue(item))
        : [];
    }

    return value;
  }

  // Debug helper to check document state
  async getDocument(collection: string, documentId: string): Promise<Record<string, unknown> | null> {
    const url = `${this.getBaseUrl()}/${collection}/${documentId}?key=${this.apiKey}`;
    
    console.log('Firebase getDocument - URL:', url);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Failed to get document: ${response.statusText}`);
    }
    
    const data = await response.json() as { name: string; fields?: Record<string, unknown> };
    console.log('Firebase getDocument - Raw response:', JSON.stringify(data, null, 2));
    
    const converted = this.convertFromFirestore(data);
    console.log('Firebase getDocument - Converted:', JSON.stringify(converted, null, 2));
    
    return converted;
  }
}
