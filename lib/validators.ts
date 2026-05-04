import * as z from "zod"

import { ACCEPTED_IMAGE_TYPES, ACCEPTED_PDF_TYPES, MAX_FILE_SIZE, MAX_IMAGE_SIZE } from "@/lib/constants"

const fileSchema = z.instanceof(File)

export const pdfFileSchema = fileSchema
  .refine((file) => ACCEPTED_PDF_TYPES.includes(file.type), "Only PDF files are allowed")
  .refine((file) => file.size <= MAX_FILE_SIZE, "PDF must be less than 50MB")

export const coverImageSchema = fileSchema
  .nullable()
  .optional()
  .refine((file) => !file || ACCEPTED_IMAGE_TYPES.includes(file.type), "Only JPEG, PNG, or WebP images are allowed")
  .refine((file) => !file || file.size <= MAX_IMAGE_SIZE, "Cover image must be less than 10MB")
