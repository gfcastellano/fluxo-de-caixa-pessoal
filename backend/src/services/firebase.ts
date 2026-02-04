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

    // Firestore PATCH updates need to use updateMask to only update specific fields
    // Build updateMask.fieldPaths parameter for each field being updated
    const fieldPaths = Object.keys(data);
    const updateMaskParams = fieldPaths.map(field => `updateMask.fieldPaths=${encodeURIComponent(field)}`).join('&');
    
    const urlWithMask = `${url}&${updateMaskParams}`;

    const requestBody = JSON.stringify({ fields: firestoreData });

    const response = await fetch(urlWithMask, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: requestBody,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to update document: ${response.statusText} - ${errorText}`);
    }
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

  async getDocument(collection: string, documentId: string): Promise<Record<string, unknown> | null> {
    const url = `${this.getBaseUrl()}/${collection}/${documentId}?key=${this.apiKey}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Failed to get document: ${response.statusText}`);
    }
    
    const data = await response.json() as { name: string; fields?: Record<string, unknown> };
    
    return this.convertFromFirestore(data);
  }

  /**
   * Query documents with filters using Firestore REST API
   * @param collection - The collection name
   * @param filters - Array of filter conditions { field, op, value }
   * @returns Array of matching documents
   */
  async queryDocuments(
    collection: string,
    filters: Array<{ field: string; op: string; value: unknown }>
  ): Promise<Record<string, unknown>[]> {
    // The :runQuery endpoint is at the documents level, not the collection level
    // The collection is specified in the structuredQuery.from field
    const url = `${this.getBaseUrl()}:runQuery?key=${this.apiKey}`;

    // Build structured query
    const structuredQuery: Record<string, unknown> = {
      from: [{ collectionId: collection }],
    };

    // Add filters if provided
    if (filters.length > 0) {
      if (filters.length === 1) {
        structuredQuery.where = this.buildFilter(filters[0]);
      } else {
        // Multiple filters - use composite filter
        structuredQuery.where = {
          compositeFilter: {
            op: 'AND',
            filters: filters.map(f => this.buildFilter(f)),
          },
        };
      }
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ structuredQuery }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to query documents: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json() as Array<{ document?: { name: string; fields?: Record<string, unknown> } }>;
    
    // Filter out empty results and convert from Firestore format
    return data
      .filter((item) => item.document)
      .map((item) => this.convertFromFirestore(item.document!));
  }

  private buildFilter(filter: { field: string; op: string; value: unknown }): Record<string, unknown> {
    const firestoreValue = this.convertToFirestore({ v: filter.value }).v;
    
    // Map JavaScript-style operators to Firestore REST API operators
    const opMap: Record<string, string> = {
      '==': 'EQUAL',
      'EQUAL': 'EQUAL',
      '!=': 'NOT_EQUAL',
      '<': 'LESS_THAN',
      '<=': 'LESS_THAN_OR_EQUAL',
      '>': 'GREATER_THAN',
      '>=': 'GREATER_THAN_OR_EQUAL',
      'array-contains': 'ARRAY_CONTAINS',
      'in': 'IN',
      'array-contains-any': 'ARRAY_CONTAINS_ANY',
      'not-in': 'NOT_IN',
    };
    
    const firestoreOp = opMap[filter.op] || filter.op;
    
    return {
      fieldFilter: {
        field: { fieldPath: filter.field },
        op: firestoreOp,
        value: firestoreValue,
      },
    };
  }
}
