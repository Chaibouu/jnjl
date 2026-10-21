/**
 * Réduit une photo avant son envoi : une photo de téléphone pèse 3 à 8 Mo, alors que le serveur n'accepte que
 * 4 Mo par requête. Elle est ramenée à `maxSide` pixels au plus et recompressée en JPEG (≈ 200 Ko), ce qui suffit
 * largement pour un badge. L'orientation EXIF est respectée par le navigateur lors du décodage.
 * En cas d'échec (format non décodable par le navigateur), le fichier d'origine est renvoyé tel quel.
 */
export async function shrinkImage(file: File, maxSide = 1200, quality = 0.85): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.fillStyle = "#ffffff"; // fond blanc pour les PNG transparents
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}
