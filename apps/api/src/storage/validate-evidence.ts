import { BadRequestException } from "@nestjs/common";

export const publicImageTypes = ["image/png", "image/jpeg", "image/webp"];

export function validateEvidence(files: Express.Multer.File[]) {
  for (const file of files) {
    const bytes = file.buffer;
    const valid = bytes && bytes.length > 0 && bytes.length <= 5 * 1024 * 1024 && (
      (file.mimetype === "image/png" && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) ||
      (file.mimetype === "image/jpeg" && bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255]))) ||
      (file.mimetype === "image/webp" && bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP") ||
      (file.mimetype === "application/pdf" && bytes.subarray(0, 5).toString("ascii") === "%PDF-")
    );
    if (!valid) throw new BadRequestException("Isi file tidak cocok dengan tipe PNG, JPG, WEBP, atau PDF yang dipilih.");
  }
}
