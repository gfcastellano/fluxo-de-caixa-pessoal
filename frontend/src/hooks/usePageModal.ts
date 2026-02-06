import { useState, useEffect, useCallback } from 'react';
import { useVoice } from '../context/VoiceContext';

export interface UsePageModalOptions<T> {
    /** Initial state for the editing item */
    initialItem?: T | null;
}

export interface UsePageModalReturn<T> {
    /** Whether the modal is open */
    isOpen: boolean;
    /** The item being edited, or null if creating new */
    editingItem: T | null;
    /** Whether to auto-start recording when modal opens */
    autoStartRecording: boolean;
    /** Open the modal for creating a new item */
    openCreate: () => void;
    /** Open the modal for editing an existing item */
    openEdit: (item: T) => void;
    /** Close the modal and reset state */
    close: () => void;
}

/**
 * Hook to manage modal state in page components.
 * Automatically listens to VoiceContext for Hero button triggers.
 */
export function usePageModal<T>(_options: UsePageModalOptions<T> = {}): UsePageModalReturn<T> {
    const [isOpen, setIsOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<T | null>(null);
    const [autoStartRecording, setAutoStartRecording] = useState(false);

    const { shouldOpenModal, shouldAutoRecord, clearModalRequest } = useVoice();

    // Listen for Hero button click to open modal
    useEffect(() => {
        if (shouldOpenModal) {
            setAutoStartRecording(shouldAutoRecord);
            setEditingItem(null);
            setIsOpen(true);
            clearModalRequest();
        }
    }, [shouldOpenModal, shouldAutoRecord, clearModalRequest]);

    const openCreate = useCallback(() => {
        setAutoStartRecording(false);
        setEditingItem(null);
        setIsOpen(true);
    }, []);

    const openEdit = useCallback((item: T) => {
        setAutoStartRecording(false);
        setEditingItem(item);
        setIsOpen(true);
    }, []);

    const close = useCallback(() => {
        setIsOpen(false);
        setAutoStartRecording(false);
        setEditingItem(null);
    }, []);

    return {
        isOpen,
        editingItem,
        autoStartRecording,
        openCreate,
        openEdit,
        close,
    };
}
