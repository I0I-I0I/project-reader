export interface NotificationData {
    line1: string
    line2: string
}

class NotificationStore {
    current = $state<NotificationData | null>(null)
    private clearTimer: ReturnType<typeof setTimeout> | undefined

    publish(notification: NotificationData): void {
        this.current = notification
        clearTimeout(this.clearTimer)
        this.clearTimer = setTimeout(() => this.clear(), 5000)
    }

    clear(): void {
        clearTimeout(this.clearTimer)
        this.clearTimer = undefined
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
