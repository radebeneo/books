"use client"

import React, { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Upload, Image as ImageIcon, X } from "lucide-react"
import { useRouter } from "next/navigation"

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import LoadingOverlay from "@/components/LoadingOverlay"
import {cn, parsePDFFile} from "@/lib/utils"
import { voiceOptions, voiceCategories } from "@/lib/constants"
import { coverImageSchema, pdfFileSchema } from "@/lib/validators"
import {useAuth} from "@clerk/react"
import { toast } from 'sonner'
import {checkBookExists, createBook} from "@/lib/actions/book.actions";
import {upload} from "@vercel/blob/client";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  author: z.string().min(1, "Author name is required"),
  persona: z.string().min(1, "Please choose a voice"),
  pdfFile: pdfFileSchema,
  coverImage: coverImageSchema,
})

type FormValues = z.infer<typeof formSchema>

const UploadForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { userId } = useAuth()
  const router = useRouter()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      author: "",
      persona: "",
      pdfFile: undefined,
      coverImage: undefined,
    },
  })

  const onSubmit = async (data: FormValues) => {

    if(!userId) {
        return toast.error("Please login to upload books")
    }



    setIsSubmitting(true)
    try {
        const existsCheck = await checkBookExists(data.title)

        if(existsCheck.exists && existsCheck.book){
            toast.info("Book with the same title already exists.")
            form.reset()
            router.push(`/books/${existsCheck.book.slug}`)
            return
        }

        const fileTitle = data.title.replace(/\s+/g, "-").toLowerCase()
        const pdfFile = data.pdfFile

        const parsedPDF = await parsePDFFile(pdfFile)

        if (parsedPDF.content.length === 0 ) {
            toast.error("Failed to parse pdf. Please try again with different file.")
            return
        }

        const uploadedPdfBlob = await upload(fileTitle, pdfFile, {
            access: 'public',
            handleUploadUrl: '/api/upload',
            contentType: 'application/pdf'
        })

        let coverUrl: string

        if(data.coverImage) {
            const coverFile = data.coverImage
            const uploadedCoverBlob = await upload(`${fileTitle}_cover.png`, coverFile, {
                access: 'public',
                handleUploadUrl: '/api/upload',
                contentType: coverFile.type,
            })
            coverUrl = uploadedCoverBlob.url
        } else {
            const response = await fetch(parsedPDF.cover)
            const blob = await response.blob()

            const uploadedCoverBlob = await upload(`${fileTitle}_cover.png`, blob, {
                access: 'public',
                handleUploadUrl: '/api/upload',
                contentType: 'image/png'
            })
            coverUrl = uploadedCoverBlob.url
        }


        const book = await createBook({
            clerkId: userId,
            title: data.title,
            author: data.author,
            persona: data.persona,
            fileURL: uploadedPdfBlob.url,
            fileBlobKey: uploadedPdfBlob.pathname,
            coverURL: coverUrl,
            fileSize: pdfFile.size
        })
    } catch (error) {
      console.error(error)

        toast.error("Failed to upload book. Please try again later.")


    } finally {
        setIsSubmitting(false)
    }
  }

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: "pdfFile" | "coverImage"
  ) => {
    const file = e.target.files?.[0]
    if (file) {
      form.setValue(field, file)
      form.clearErrors(field)
    }
  }

  const removeFile = (field: "pdfFile" | "coverImage") => {
    form.setValue(field, undefined)
  }

  return (
    <div className="new-book-wrapper">
      {isSubmitting && <LoadingOverlay />}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* PDF file upload */}
          <FormField
            control={form.control}
            name="pdfFile"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="form-label">Book PDF File</FormLabel>
                <FormControl>
                  <div className="relative">
                    {field.value ? (
                      <div className="upload-dropzone upload-dropzone-uploaded">
                        <div className="flex items-center justify-between w-full px-4">
                          <span className="truncate font-medium">{field.value.name}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeFile("pdfFile")}
                            className="upload-dropzone-remove"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="relative">
                        <input
                          type="file"
                          accept=".pdf"
                          onChange={(e) => handleFileChange(e, "pdfFile")}
                          className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                        />
                        <div className="upload-dropzone">
                          <Upload className="upload-dropzone-icon" />
                          <p className="upload-dropzone-text">Click to upload PDF</p>
                          <p className="upload-dropzone-hint">PDF file (max 50MB)</p>
                        </div>
                      </div>
                    )}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Cover image upload */}
          <FormField
            control={form.control}
            name="coverImage"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="form-label">Cover Image (Optional)</FormLabel>
                <FormControl>
                  <div className="relative">
                    {field.value ? (
                      <div className="upload-dropzone upload-dropzone-uploaded">
                        <div className="flex items-center justify-between w-full px-4">
                          <span className="truncate font-medium">{field.value.name}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeFile("coverImage")}
                            className="upload-dropzone-remove"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="relative">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileChange(e, "coverImage")}
                          className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                        />
                        <div className="upload-dropzone">
                          <ImageIcon className="upload-dropzone-icon" />
                          <p className="upload-dropzone-text">Click to upload cover image</p>
                          <p className="upload-dropzone-hint">Leave empty to auto-generate from PDF</p>
                        </div>
                      </div>
                    )}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Title input */}
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="form-label">Title</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="ex: Rich Dad Poor Dad"
                    className="form-input"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Author input */}
          <FormField
            control={form.control}
            name="author"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="form-label">Author Name</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="ex: Robert Kiyosaki"
                    className="form-input"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Voice selector */}
          <FormField
            control={form.control}
            name="persona"
            render={({ field }) => (
              <FormItem className="space-y-4">
                <FormLabel className="form-label">Choose Assistant Voice</FormLabel>
                <FormControl>
                  <RadioGroup
                    value={field.value}
                    onValueChange={field.onChange}
                    className="space-y-6"
                  >
                    <div>
                      <h4 className="mb-3 text-sm font-medium text-foreground/60">Male Voices</h4>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        {voiceCategories.male.map((voiceKey) => {
                          const voice = voiceOptions[voiceKey as keyof typeof voiceOptions]
                          return (
                            <div key={voiceKey} className="relative h-full w-full">
                              <RadioGroupItem
                                value={voiceKey}
                                id={voiceKey}
                                className="sr-only"
                              />
                              <label htmlFor={voiceKey} className={cn("voice-selector-option block cursor-pointer transition-all h-full w-full",
                                  field.value === voiceKey && "voice-selector-option-selected ring-2 ring-[#663820] ring-offset-2")}>

                                <div className="flex items-center gap-3">
                                  <div className={cn("h-5 w-5 shrink-0 mt-0.5 rounded-full border-2 border-[#663820]/30 flex items-center justify-center transition-all",
                                    field.value === voiceKey && "border-[#663820] bg-[#663820]")}>
                                    {field.value === voiceKey && <div className="h-2 w-2 rounded-full bg-white" />}
                                  </div>
                                  <div>
                                    <p className="font-bold text-[#212a3b] text-base">{voice.name}</p>
                                    <p className="text-sm text-[#212a3b]/70 leading-snug mt-1">{voice.description}</p>
                                  </div>
                                </div>

                              </label>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    <div>
                      <h4 className="mb-3 text-sm font-medium text-foreground/60">Female Voices</h4>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {voiceCategories.female.map((voiceKey) => {
                          const voice = voiceOptions[voiceKey as keyof typeof voiceOptions]
                          return (
                            <div key={voiceKey} className="relative h-full w-full">
                              <RadioGroupItem
                                value={voiceKey}
                                id={voiceKey}
                                className="sr-only"
                              />
                              <label
                                htmlFor={voiceKey}
                                className={cn(
                                  "voice-selector-option block cursor-pointer transition-all h-full w-full",
                                  field.value === voiceKey && "voice-selector-option-selected ring-2 ring-[#663820] ring-offset-2"
                                )}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={cn(
                                    "h-5 w-5 shrink-0 mt-0.5 rounded-full border-2 border-[#663820]/30 flex items-center justify-center transition-all",
                                    field.value === voiceKey && "border-[#663820] bg-[#663820]"
                                  )}>
                                    {field.value === voiceKey && <div className="h-2 w-2 rounded-full bg-white" />}
                                  </div>
                                  <div>
                                    <p className="font-bold text-[#212a3b] text-base">{voice.name}</p>
                                    <p className="text-sm text-[#212a3b]/70 leading-snug mt-1">
                                      {voice.description}
                                    </p>
                                  </div>
                                </div>
                              </label>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Submit button */}
          <Button
            type="submit"
            className="form-btn w-full bg-[#663820] text-white hover:bg-[#522d1a] transition-colors font-serif text-xl py-6 rounded-xl"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Generating..." : "Begin Synthesis"}
          </Button>
        </form>
      </Form>
    </div>
  )
}

export default UploadForm
