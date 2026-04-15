import {CreateBook} from '@/types'
import {connectToDatabase} from "@/database/mongoose";
import {generateSlug, serializeData} from "@/lib/utils";
import Book from "@/database/models/book.model";

export const createBook = async (data: CreateBook) => {
    try{
        await connectToDatabase()
        const slug = generateSlug(data.title)
        const existingBook = await Book.findOne({slug}).lean();

        if(existingBook){
            return {
                success: true,
                data: serializeData(existingBook),
                alreadyExists: true
            }
        }

        const book = await Book.create({...data, slug, totalSegments: 0})

        return {
            success: true,
            data: serializeData(book)
        }
    } catch (e) {
        console.error('Error creating book: ', e)
        return{
            success: false,
            error: e
        }
    }
}