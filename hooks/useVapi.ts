import { IBook, Messages } from '@/types'
import { useAuth } from '@clerk/nextjs';
import { useEffect, useRef, useState } from 'react';
import { DEFAULT_VOICE } from '@/lib/constants';
import { startVoiceSession } from '@/lib/actions/session.actions';
import Vapi from '@vapi-ai/web';

export type CallStatus = 'idle' | 'connecting' | 'starting' | 'listening' | 'thinking' | 'speaking';


const useLatestRef = <T>(value: T) => {
    const ref = useRef(value)
    useEffect(() => {
        ref.current = value;
    }, [value]);

    return ref;
}

const VAPI_API_KEY = process.env.NEXT_PUBLIC_VAPI_API_KEY

let vapi: InstanceType<typeof Vapi>

function getVapi() {
    if (!vapi) {
        if (!VAPI_API_KEY) {
            throw new Error('VAPI_API_KEY not found. Please set it in the .env file.')
        }
        vapi = new Vapi(VAPI_API_KEY);
    }
    return vapi;
}


export const useVapi = (book: IBook) => {
    const { userId } = useAuth();
    //TODO: Implement limits

    const [status, setStatus] = useState<CallStatus>('idle');
    const [messages, setMessages] = useState<Messages[]>([]);
    const [currentMessage, setCurrentMessage] = useState('')
    const [currentUserMessage, setCurrentUserMessage] = useState('')
    const [duration, setDuration] = useState(0)
    const [limitError, setLimitError] = useState<string | null>(null)

    const timerRef = useRef<NodeJS.Timeout | null>(null)
    const startTimerRef = useRef<NodeJS.Timeout | null>(null)
    const sessionIdRef = useRef<string | null>(null)
    const isStoppingRef = useRef<boolean>(false)

    const bookRef = useLatestRef(book);
    const durationRef = useLatestRef(duration);
    const voice = book.persona || DEFAULT_VOICE;



    const isActive = status === 'listening' || status === 'thinking' || status === 'speaking' || status === 'starting'


    //Limits
    // const maxDurationRef = useLatestRef(limits.maxSessionMinutes * 60);
    // const maxDurationSeconds
    // const remainingSeconds
    // const showTimeWarning

    const start = async () => {
        if (!userId) return setLimitError('Please login to start conversation')

        setLimitError(null)
        setStatus('connecting')

        try {
            const result = await startVoiceSession(userId, book._id);

            if (!result.success) {
                setLimitError(result.error || 'Session limit reached. Please upgrade your plan')
                setStatus('idle');
                return;
            }

            sessionIdRef.current = result.sessionId || null;

            const firstMessage = `Hey, nice to meet you. 
            Quick question, before we dive in: have you actually read ${book.title} yet? Or are we starting fresh? `

        } catch (e) {
            console.log('Error starting call', e)
            setStatus('idle')
            setLimitError('An error occurred. Please try again')
        }
    }
    const stop = async () => { }
    const clearErrors = async () => { }


    return {
        status, isActive, messages, currentMessage, currentUserMessage,
        duration, limitError, start, stop, clearErrors,
        // maxDurationSeconds, remainingSeconds, showTimeWarning,
    }
}

export default useVapi;
