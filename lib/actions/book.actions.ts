import {CreateBook} from '@/types'
import {connectToDatabase} from "@/database/mongoose";

export const createBook = async (data: CreateBook) => {
    try{
        await connectToDatabase()

        const slug = generateSlug()
    } catch (e) {
        console.error('Error creating book: ', e)
        return{
            success: false,
            error: e
        }
    }
}