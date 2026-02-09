import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from './AuthContext';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { hasVoiceConsent, saveVoiceConsentLocal } from '../components/VoiceConsentModal';
import {
    sendVoiceTransaction,
    sendVoiceTransactionUpdate,
    sendVoiceCategoryUpdate,
    sendVoiceAccountUpdate,
    getVoiceConsent,
} from '../services/voiceService';
import { createTransaction, updateTransaction } from '../services/transactionService';
import { createCategory, updateCategory } from '../services/categoryService';
import { createAccount, updateAccount } from '../services/accountService';
import type { Transaction, Category, Account } from '../types';

// Page types that support voice creation
export type VoicePageType = 'transaction' | 'category' | 'account' | 'budget' | null;

// Created item can be any of these types
export type CreatedItem = Transaction | Category | Account | null;

interface VoiceContextType {
    // Current page determines item type
    currentPageType: VoicePageType;

    // Created item for edit flow
    createdItem: CreatedItem;
    isEditing: boolean;

    // Voice recorder state
    isRecording: boolean;
    isPreview: boolean;
    isProcessing: boolean;
    audioBlob: Blob | null;

    // Audio visualization
    getAudioLevel: () => number;

    // Actions
    startRecording: () => Promise<void>;
    stopRecording: () => Promise<void>;
    confirmAudio: () => Promise<void>;
    cancelAudio: () => void;
    resetSession: () => void;

    // Feedback
    feedback: { type: 'success' | 'error'; message: string } | null;

    // Whether voice button should be visible
    isVoiceEnabled: boolean;

    // Modal control - Hero button triggers this, pages listen
    shouldOpenModal: boolean;
    shouldAutoRecord: boolean;
    requestOpenModal: () => void;
    clearModalRequest: () => void;

    // Voice consent
    hasConsent: boolean;
    showConsentModal: boolean;
    requestConsent: () => void;
    acceptConsent: () => void;
    declineConsent: () => void;
}

const VoiceContext = createContext<VoiceContextType | undefined>(undefined);

// Map routes to voice page types
const ROUTE_TO_PAGE_TYPE: Record<string, VoicePageType> = {
    '/': 'transaction',
    '/transactions': 'transaction',
    '/categories': 'category',
    '/accounts': 'account',
    '/budgets': 'budget',
    '/reports': null, // No voice on reports
};

interface VoiceProviderProps {
    children: ReactNode;
    categories?: Category[];
}

export function VoiceProvider({ children, categories = [] }: VoiceProviderProps) {
    const { user } = useAuth();
    const { t, i18n } = useTranslation();
    const location = useLocation();

    const voiceRecorder = useVoiceRecorder();

    const [createdItem, setCreatedItem] = useState<CreatedItem>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [shouldOpenModal, setShouldOpenModal] = useState(false);
    const [shouldAutoRecord, setShouldAutoRecord] = useState(false);

    // Voice consent state
    const [showConsentModal, setShowConsentModal] = useState(false);
    const [hasConsent, setHasConsent] = useState(() => hasVoiceConsent());
    const [isLoadingConsent, setIsLoadingConsent] = useState(true);

    // Load voice consent from Firestore when user logs in
    useEffect(() => {
        const loadVoiceConsent = async () => {
            if (!user) {
                setHasConsent(false);
                setIsLoadingConsent(false);
                return;
            }

            setIsLoadingConsent(true);
            try {
                // First check localStorage for immediate response
                const localConsent = hasVoiceConsent();

                // Then fetch from server
                const result = await getVoiceConsent();

                if (result.success && result.data) {
                    const serverConsent = result.data.voiceConsent === true;
                    setHasConsent(serverConsent);

                    // Sync localStorage with server if they differ
                    if (serverConsent !== localConsent) {
                        saveVoiceConsentLocal(serverConsent);
                    }
                } else {
                    // If server request fails, fall back to localStorage
                    setHasConsent(localConsent);
                }
            } catch (error) {
                console.error('Error loading voice consent:', error);
                // Fall back to localStorage on error
                setHasConsent(hasVoiceConsent());
            } finally {
                setIsLoadingConsent(false);
            }
        };

        loadVoiceConsent();
    }, [user]);

    // Request consent modal
    const requestConsent = useCallback(() => {
        setShowConsentModal(true);
    }, []);

    // Accept consent
    const acceptConsent = useCallback(() => {
        setHasConsent(true);
        setShowConsentModal(false);
    }, []);

    // Decline consent
    const declineConsent = useCallback(() => {
        setHasConsent(false);
        setShowConsentModal(false);
    }, []);

    // Determine current page type from route
    const currentPageType = useMemo((): VoicePageType => {
        const path = location.pathname;
        return ROUTE_TO_PAGE_TYPE[path] ?? null;
    }, [location.pathname]);

    // Whether voice is enabled for this page
    const isVoiceEnabled = currentPageType !== null;

    // Derived states from recorder
    const isRecording = voiceRecorder.state === 'recording';
    const isPreview = voiceRecorder.state === 'preview';
    const isProcessing = voiceRecorder.state === 'processing';

    // Clear feedback after timeout
    const showFeedback = useCallback((type: 'success' | 'error', message: string) => {
        setFeedback({ type, message });
        setTimeout(() => setFeedback(null), 4000);
    }, []);

    // Request to open modal with auto-record (called by Hero button)
    const requestOpenModal = useCallback(() => {
        setShouldOpenModal(true);
        setShouldAutoRecord(true); // Always auto-record when Hero is clicked
    }, []);

    // Clear modal request (called by pages after opening modal)
    const clearModalRequest = useCallback(() => {
        setShouldOpenModal(false);
        setShouldAutoRecord(false);
    }, []);

    // Reset modal request when route changes
    useEffect(() => {
        setShouldOpenModal(false);
    }, [location.pathname]);

    // Start recording
    const startRecording = useCallback(async () => {
        if (!user || !currentPageType) return;
        setFeedback(null);
        await voiceRecorder.startRecording();
    }, [user, currentPageType, voiceRecorder]);

    // Stop recording (moves to preview)
    const stopRecording = useCallback(async () => {
        await voiceRecorder.stopRecording();
    }, [voiceRecorder]);

    // Cancel audio (discard and reset)
    const cancelAudio = useCallback(() => {
        voiceRecorder.clearAudio();
        setFeedback(null);
    }, [voiceRecorder]);

    // Confirm and send audio for processing
    const confirmAudio = useCallback(async () => {
        if (!user || !currentPageType) return;

        const blob = voiceRecorder.confirmAudio();
        if (!blob) return;

        try {
            if (currentPageType === 'transaction') {
                if (isEditing && createdItem && 'amount' in createdItem) {
                    // Update existing transaction
                    const result = await sendVoiceTransactionUpdate(
                        blob,
                        i18n.language,
                        createdItem as Transaction,
                        categories
                    );

                    if (result.success && result.data) {
                        // Apply updates to Firestore (updateTransaction takes 2 args: transactionId, updates)
                        await updateTransaction(createdItem.id, result.data);
                        setCreatedItem({ ...createdItem, ...result.data } as Transaction);
                        showFeedback('success', result.message || t('voice.updateSuccess'));
                    } else {
                        showFeedback('error', result.error || t('voice.error'));
                    }
                } else {
                    // Create new transaction
                    const result = await sendVoiceTransaction(blob, i18n.language);

                    if (result.success && result.data) {
                        // Save to Firestore
                        const newTransaction = await createTransaction(user.uid, result.data);
                        setCreatedItem(newTransaction);
                        setIsEditing(true);
                        showFeedback('success', result.message || t('voice.transactionCreated'));
                    } else {
                        showFeedback('error', result.error || t('voice.error'));
                    }
                }
            } else if (currentPageType === 'category') {
                if (isEditing && createdItem && 'type' in createdItem && !('amount' in createdItem)) {
                    // Update existing category
                    const result = await sendVoiceCategoryUpdate(
                        blob,
                        i18n.language,
                        createdItem as Category,
                        true
                    );

                    if (result.success && result.data) {
                        // updateCategory takes 2 args: categoryId, updates
                        await updateCategory(createdItem.id, result.data);
                        setCreatedItem({ ...createdItem, ...result.data } as Category);
                        showFeedback('success', result.message || t('voice.updateSuccess'));
                    } else {
                        showFeedback('error', result.error || t('voice.error'));
                    }
                } else {
                    // Create new category
                    const result = await sendVoiceCategoryUpdate(blob, i18n.language, {}, false);

                    if (result.success && result.data) {
                        const categoryData = result.data as Omit<Category, 'id' | 'userId' | 'createdAt'>;
                        const newCategory = await createCategory(user.uid, categoryData);
                        setCreatedItem(newCategory);
                        setIsEditing(true);
                        showFeedback('success', result.message || t('voice.categoryCreated'));
                    } else {
                        showFeedback('error', result.error || t('voice.error'));
                    }
                }
            } else if (currentPageType === 'account') {
                if (isEditing && createdItem && 'balance' in createdItem) {
                    // Update existing account
                    const result = await sendVoiceAccountUpdate(
                        blob,
                        i18n.language,
                        createdItem as Account,
                        true
                    );

                    if (result.success && result.data) {
                        // updateAccount takes 2 args: accountId, updates
                        await updateAccount(createdItem.id, result.data);
                        setCreatedItem({ ...createdItem, ...result.data } as Account);
                        showFeedback('success', result.message || t('voice.updateSuccess'));
                    } else {
                        showFeedback('error', result.error || t('voice.error'));
                    }
                } else {
                    // Create new account
                    const result = await sendVoiceAccountUpdate(blob, i18n.language, {}, false);

                    if (result.success && result.data) {
                        // createAccount takes 1 arg: AccountInput (which includes userId)
                        const today = new Date().toISOString().split('T')[0];
                        const accountData = {
                            userId: user.uid,
                            name: result.data.name || 'Nova Conta',
                            balance: result.data.balance || 0,
                            initialBalance: result.data.balance || 0,
                            balanceDate: today,
                            currency: result.data.currency || 'BRL',
                            isDefault: false,
                            isCash: false,
                        };
                        const newAccount = await createAccount(accountData);
                        setCreatedItem(newAccount);
                        setIsEditing(true);
                        showFeedback('success', result.message || t('voice.accountCreated'));
                    } else {
                        showFeedback('error', result.error || t('voice.error'));
                    }
                }
            }
        } catch (error) {
            console.error('Voice processing error:', error);
            showFeedback('error', t('voice.error'));
        } finally {
            voiceRecorder.reset();
        }
    }, [user, currentPageType, isEditing, createdItem, voiceRecorder, i18n.language, categories, t, showFeedback]);

    // Reset the entire voice session
    const resetSession = useCallback(() => {
        voiceRecorder.reset();
        setCreatedItem(null);
        setIsEditing(false);
        setFeedback(null);
        setShouldOpenModal(false);
    }, [voiceRecorder]);

    const value: VoiceContextType = {
        currentPageType,
        createdItem,
        isEditing,
        isRecording,
        isPreview,
        isProcessing,
        audioBlob: voiceRecorder.audioBlob,
        getAudioLevel: voiceRecorder.getAudioLevel,
        startRecording,
        stopRecording,
        confirmAudio,
        cancelAudio,
        resetSession,
        feedback,
        isVoiceEnabled,
        shouldOpenModal,
        shouldAutoRecord,
        requestOpenModal,
        clearModalRequest,
        hasConsent,
        showConsentModal,
        requestConsent,
        acceptConsent,
        declineConsent,
    };

    return (
        <VoiceContext.Provider value={value}>
            {children}
        </VoiceContext.Provider>
    );
}

export function useVoice(): VoiceContextType {
    const context = useContext(VoiceContext);
    if (context === undefined) {
        throw new Error('useVoice must be used within a VoiceProvider');
    }
    return context;
}
