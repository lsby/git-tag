export {}

declare global {
  interface Window {
    electronAPI?: { 获取文件路径: (文件: File) => string; 选择文件夹: () => Promise<string | null> }
  }
}
