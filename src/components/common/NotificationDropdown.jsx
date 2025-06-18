// src/components/common/NotificationDropdown.jsx
import React from 'react';
import { Bell, Eraser, X, ArrowRight } from 'lucide-react';
import { Button } from '../ui';
import { cn } from '../../utils';

const NotificationItem = ({ notification, onMarkAsRead, onNotificationSelect }) => {
    const handleItemClick = () => {
        if (notification.notification_category === 'CYCLE_VISIT' && notification.ordre_imputation_related && onNotificationSelect) {
            onNotificationSelect(notification.ordre_imputation_related, notification.id, 'CYCLE_VISIT', notification.ordre_imputation_related_value, notification.message);
        } else if (notification.notification_category === 'PREVENTIVE_CHECKLIST' && notification.ordre_imputation_related && onNotificationSelect) {
            onNotificationSelect(notification.ordre_imputation_related, notification.id, 'PREVENTIVE_CHECKLIST', notification.ordre_imputation_related_value, notification.message);
        } else if (notification.task_related && onNotificationSelect) {
            onNotificationSelect(notification.task_related, notification.id, 'TASK', notification.task_related_identifier, notification.message);
        } else if (!notification.read && onMarkAsRead) {
            onMarkAsRead(notification.id);
        }
    };

    const isClickable = (notification.task_related || (notification.notification_category === 'CYCLE_VISIT' && notification.ordre_imputation_related) || (notification.notification_category === 'PREVENTIVE_CHECKLIST' && notification.ordre_imputation_related));
    
    let itemTitle = `Notification: ${notification.message}`;
    if (notification.notification_category === 'CYCLE_VISIT') {
        itemTitle = `Visite de Cycle pour OI: ${notification.ordre_imputation_related_value || 'N/A'}. ${notification.message}`;
    } else if (notification.notification_category === 'PREVENTIVE_CHECKLIST') {
        itemTitle = `Maintenance Préventive pour OI: ${notification.ordre_imputation_related_value || 'N/A'}. ${notification.message}`;
    } else if (notification.notification_category === 'TASK') {
        itemTitle = `Tâche: ${notification.task_related_identifier || 'N/A'}. ${notification.message}`;
    }

    return (
        <div 
            className={`p-3 border-b last:border-b-0 ${notification.read ? 'bg-gray-100 opacity-70' : 'bg-white hover:bg-slate-50 transition-colors'} ${isClickable ? 'cursor-pointer' : ''}`} 
            onClick={isClickable ? handleItemClick : undefined} 
            role={isClickable ? "button" : "listitem"} 
            tabIndex={isClickable ? 0 : -1} 
            onKeyDown={(e) => { if (isClickable && (e.key === 'Enter' || e.key === ' ')) handleItemClick(); }} 
            aria-label={isClickable ? `Notification: ${itemTitle}. Cliquez pour voir les details.` : `Notification: ${itemTitle}`} 
            title={itemTitle}
        >
            <p className="text-sm text-gray-700 truncate">{notification.message}</p>
            <div className="text-xs text-gray-400 mt-1 flex justify-between items-center">
                <span>{new Date(notification.timestamp).toLocaleString()}</span>
                {!notification.read && !isClickable && (
                    <Button variant="link" size="sm" onClick={(e) => { e.stopPropagation(); onMarkAsRead(notification.id); }} className="text-blue-500 hover:text-blue-700 text-xs font-medium p-0 h-auto">
                        Marquer comme lu
                    </Button>
                )}
            </div>
            {notification.ordre_imputation_related_value && (
                 <p className={cn("text-xs mt-0.5", notification.notification_category === 'CYCLE_VISIT' ? 'text-blue-600' : notification.notification_category === 'PREVENTIVE_CHECKLIST' ? 'text-orange-600' : 'text-gray-500' )}>
                     OI: {notification.ordre_imputation_related_value}
                 </p>
            )}
            {notification.notification_category === 'TASK' && notification.task_related_identifier && (
                <p className="text-xs text-purple-600 mt-0.5">Tâche: {notification.task_related_identifier}</p>
            )}
        </div>
    );
};


const NotificationDropdown = ({ notifications, isOpen, onClose, onMarkAsRead, onMarkAllAsRead, onNotificationSelect, onClearAllFrontend }) => {
    if (!isOpen) return null;
    const unreadCount = notifications.filter(n => !n.read).length;
    const hasNotifications = notifications.length > 0;

    return (
        <div className="absolute right-0 mt-2 w-80 max-w-sm bg-white rounded-md shadow-lg border z-50 overflow-hidden animate-in fade-in-0 zoom-in-95">
            <div className="p-3 border-b flex justify-between items-center bg-slate-50">
                <h3 className="text-sm font-semibold text-gray-700">Notifications</h3>
                {unreadCount > 0 && (
                    <Button variant="link" size="sm" className="text-xs h-auto p-0 text-blue-600 hover:text-blue-700" onClick={onMarkAllAsRead}>
                        Tout marquer comme lu ({unreadCount})
                    </Button>
                )}
            </div>
            <div className="max-h-80 overflow-y-auto custom-scrollbar">
                {notifications.length === 0 ? (
                    <p className="text-sm text-gray-500 p-4 text-center">Aucune notification.</p>
                ) : (
                    notifications.map(notif => (
                        <NotificationItem key={notif.id} notification={notif} onMarkAsRead={onMarkAsRead} onNotificationSelect={onNotificationSelect} />
                    ))
                )}
            </div>
            <div className="p-2 bg-slate-50 text-center border-t flex space-x-2">
                <Button variant="ghost" size="sm" className="flex-1 text-xs text-gray-600 hover:text-gray-800" onClick={onClose}>
                    Fermer
                </Button>
                {hasNotifications && (
                    <Button variant="outline" size="sm" className="flex-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-300" onClick={onClearAllFrontend} title="Efface toutes les notifications de cette liste (localement uniquement)">
                        <Eraser className="h-3 w-3 mr-1"/> Effacer Tout (Local)
                    </Button>
                )}
            </div>
        </div>
    );
};

export default NotificationDropdown;
