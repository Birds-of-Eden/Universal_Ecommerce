export async function uploadFile(
  file: File,
  endpoint = "/api/upload",
  onProgress?: (percent: number) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();

    if (onProgress) {
      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      });
    }

    xhr.addEventListener("load", () => {
      let data: Record<string, unknown> = {};
      try { data = JSON.parse(xhr.responseText); } catch { /* empty */ }

      const fileUrl =
        typeof data?.fileUrl === "string"
          ? data.fileUrl
          : typeof data?.url === "string"
            ? data.url
            : null;

      if (xhr.status < 200 || xhr.status >= 300 || !data.success || !fileUrl) {
        reject(new Error((data.error as string) || "File upload failed"));
        return;
      }
      resolve(fileUrl);
    });

    xhr.addEventListener("error", () => reject(new Error("Network error during upload")));
    xhr.addEventListener("abort", () => reject(new Error("Upload cancelled")));

    xhr.open("POST", endpoint);
    xhr.send(formData);
  });
}
