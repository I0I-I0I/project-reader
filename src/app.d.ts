// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
    namespace App {
        // interface Error {}
        // interface Locals {}
        // interface PageData {}
        // interface PageState {}
        // interface Platform {}
    }

    interface FileSystemHandle {
        readonly kind: "file" | "directory"
        readonly name: string
        queryPermission(descriptor?: { mode?: "read" | "readwrite" }): Promise<PermissionState>
        requestPermission(descriptor?: { mode?: "read" | "readwrite" }): Promise<PermissionState>
    }

    interface FileSystemFileHandle extends FileSystemHandle {
        readonly kind: "file"
        getFile(): Promise<File>
        createWritable(options?: { keepExistingData?: boolean }): Promise<any>
    }

    interface Window {
        showOpenFilePicker(options?: {
            multiple?: boolean
            excludeAcceptAllOption?: boolean
            types?: Array<{
                description?: string
                accept: Record<string, string[]>
            }>
        }): Promise<FileSystemFileHandle[]>
    }
}

export {}
