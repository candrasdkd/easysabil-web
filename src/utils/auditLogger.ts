import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/client';
import type { UserProfile } from '../contexts/AuthContext';

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'IMPORT' | 'EXPORT';
export type AuditEntity = 'MEMBER' | 'FAMILY' | 'ORDER' | 'SYSTEM';

export interface AuditLogEntry {
    action: AuditAction;
    entity: AuditEntity;
    entity_id: string;
    entity_name: string;
    actor_uid: string;
    actor_email: string;
    actor_status: number;
    timestamp: any; // serverTimestamp
    changes?: string; // Serialized JSON of changes or description
    details?: string;
}

export const logAudit = async (
    action: AuditAction,
    entity: AuditEntity,
    entityId: string,
    entityName: string,
    profile: UserProfile | null,
    changes?: any,
    details?: string
) => {
    if (!profile) return; // Don't log if no user profile is available

    try {
        const auditRef = collection(db, 'audit_logs');
        const logData: AuditLogEntry = {
            action,
            entity,
            entity_id: entityId,
            entity_name: entityName,
            actor_uid: profile.uid,
            actor_email: profile.email,
            actor_status: profile.status,
            timestamp: serverTimestamp(),
        };

        if (changes) {
            logData.changes = typeof changes === 'string' ? changes : JSON.stringify(changes);
        }
        
        if (details) {
            logData.details = details;
        }

        await addDoc(auditRef, logData);
    } catch (error) {
        console.error('Failed to write audit log:', error);
        // We don't throw here to avoid breaking the main application flow 
        // if auditing fails
    }
};
