'use server'

import { StartSessionResult } from "@/types";
import { connectToDatabase } from "@/database/mongoose";
import VoiceSession from "@/database/models/voice-session.model";
import { getCurrentBillingPeriodStart } from "@/lib/subscription-constants";



export const startVoiceSession = async (clerkId, bookId): Promise<StartSessionResult> => {

    try {
        await connectToDatabase();

        // Limits/Plan to see whether a session is allowed.

        const session = await VoiceSession.create({
            clerkId, bookId, startedAt: new Date(),
            billingPeriodStart: getCurrentBillingPeriodStart()
        })

    } catch (e) {
        console.error('Error starting session', e)
        return {
            success: false,
            error: 'Failed to start session',
        }
    }

}