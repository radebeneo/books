'use server'

import { CreateBook, TextSegment } from '@/types'
import { connectToDatabase } from "@/database/mongoose";
import { generateSlug, serializeData } from "@/lib/utils";
import Book from "@/database/models/book.model";
import BookSegment from "@/database/models/book-segment.model";
import { revalidatePath } from "next/cache";

export const getAllBooks = async () => {
    try {
        await connectToDatabase();
        const books = await Book.find().sort({ createdAt: -1 }).lean();
        return { success: true, data: serializeData(books) };
    } catch (e) {
        console.error('Error connecting to database', e)
        return { success: false, error: e };
    }
}

export const checkBookExists = async (title: string) => {
    try {
        await connectToDatabase();

        const slug = generateSlug(title);

        const existingBook = await Book.findOne({ slug }).lean();

        if (existingBook) {
            return {
                exists: true, book: serializeData(existingBook)
            }
        }

        return {
            exists: false
        };
    } catch (e) {
        console.error('Error checking book exists', e);
        return {
            exists: false, error: e
        }
    }

}

export const createBook = async (data: CreateBook) => {
    try {
        await connectToDatabase()
        const slug = generateSlug(data.title)
        const existingBook = await Book.findOne({ slug }).lean();

        if (existingBook) {
            return {
                success: true,
                data: serializeData(existingBook),
                alreadyExists: true
            }
        }

        const book = await Book.create({ ...data, slug, totalSegments: 0 })

        revalidatePath('/')

        return {
            success: true,
            data: serializeData(book)
        }
    } catch (e) {
        console.error('Error creating book: ', e)
        return {
            success: false,
            error: e
        }
    }
}

export const getBookBySlug = async (slug: string) => {
    try {
        await connectToDatabase();
        const book = await Book.findOne({ slug }).lean();

        if (!book) {
            return { success: false, error: 'Book not found' };
        }

        return { success: true, data: serializeData(book) };
    } catch (e) {
        console.error('Error fetching book by slug', e);
        return { success: false, error: e };
    }
}

export const saveBookSegments = async (bookId: string, clerkId: string, segments: TextSegment[]) => {
    try {
        await connectToDatabase()

        console.log('Saving book segments ...');

        const segmentsToInsert = segments.map(({ text, segmentIndex, pageNumber, wordCount }) => ({
            clerkId, bookId, content: text, segmentIndex, pageNumber, wordCount
        }))

        await BookSegment.insertMany(segmentsToInsert)
        await Book.findByIdAndUpdate(bookId, { totalSegments: segments.length })
        console.log('Book segments successfully saved.');

        return {
            success: true,
            data: { segmentsCreated: segments.length }
        }

    } catch (e) {
        console.error('Error saving book segments: ', e)
        await BookSegment.deleteMany({ bookId })
        await Book.findByIdAndDelete(bookId)
        console.log('Book segments, and book deleted due to failure tosave segments')
        return {
            success: false,
            error: e
        }
    }

}

export const searchBookSegments = async (bookId: string, query: string, limit: number = 3) => {
    try {
        await connectToDatabase();

        // Primary: MongoDB full-text search (fast, scored, uses index).
        const segments = await BookSegment.find(
            {
                bookId,
                $text: { $search: query },
            },
            { score: { $meta: 'textScore' } }
        )
            .sort({ score: { $meta: 'textScore' } })
            .limit(limit)
            .lean();

        if (segments.length > 0) {
            return {
                success: true,
                data: serializeData(segments) as { content: string; segmentIndex: number; pageNumber?: number }[],
            };
        }

        // Regex fallback: $text silently ignores tokens shorter than 3 chars
        // (e.g. "AI", "ML"), so we attempt a case-insensitive regex scan.
        // Guard: filter to tokens with ≥3 chars before building the pattern.
        // If no usable tokens remain, return empty — an empty pattern would
        // match every document and return completely unrelated segments.
        const usableTokens = query
            .split(/\s+/)
            .map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) // escape regex special chars
            .filter(t => t.length >= 3);

        if (usableTokens.length === 0) {
            return { success: true, data: [] };
        }

        const pattern = new RegExp(usableTokens.join('|'), 'i');

        const fallbackSegments = await BookSegment.find({
            bookId,
            content: { $regex: pattern },
        })
            .limit(limit)
            .lean();

        return {
            success: true,
            data: serializeData(fallbackSegments) as { content: string; segmentIndex: number; pageNumber?: number }[],
        };
    } catch (e) {
        console.error('Error searching book segments: ', e);
        return { success: false, error: e, data: [] };
    }
}