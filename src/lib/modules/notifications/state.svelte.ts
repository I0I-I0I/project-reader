export interface NotificationData {
    line1: string
    line2: string
}

class NotificationStore {
    current = $state<NotificationData | null>(null)

    publish(notification: NotificationData): void {
        this.current = notification
    }

    clear(): void {
        this.current = null
    }
}

export const notificationStore = new NotificationStore()

export function publishNotification(notification: NotificationData): void {
    notificationStore.publish(notification)
}

export function clearNotification(): void {
    notificationStore.clear()
}
