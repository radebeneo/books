import { IBook, Messages } from '@/types'
import { useAuth } from '@clerk/nextjs';
import { useEffect, useRef, useState } from 'react';
import { DEFAULT_VOICE, VOICE_SETTINGS } from '@/lib/constants';
import { startVoiceSession, endVoiceSession } from '@/lib/actions/session.actions';
import Vapi from '@vapi-ai/web';
import { ASSISTANT_ID } from '@/lib/constants';
import { getVoice } from '@/lib/utils';

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

    // ─── VAPI Event Listeners ──────────────────────────────────────────────────
    useEffect(() => {
        const vapiInstance = getVapi();

        // ── Call status ──────────────────────────────────────────────────────
        const onCallStart = () => {
            setStatus('starting');
            setDuration(0);
            timerRef.current = setInterval(() => {
                setDuration(prev => prev + 1);
            }, 1000);
        };
        const onCallEnd = () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
            setStatus('idle');
            setDuration(0);
            setCurrentMessage('');
            setCurrentUserMessage('');
        };
        const onSpeechStart = () => setStatus('speaking');
        const onSpeechEnd = () => setStatus('listening');

        // ── Message events ───────────────────────────────────────────────────
        const onMessage = (message: { type: string; role?: string; transcript?: string; transcriptType?: string }) => {
            if (message.type !== 'transcript') return;

            const { role, transcript = '', transcriptType } = message;

            if (role === 'user') {
                if (transcriptType === 'partial') {
                    // Live streaming — update the ephemeral user message
                    setCurrentUserMessage(transcript);
                } else if (transcriptType === 'final') {
                    // Commit: clear the streaming bubble, set status to thinking,
                    // and append to the messages array (deduplicated)
                    setCurrentUserMessage('');
                    setStatus('thinking');
                    setMessages(prev => {
                        const last = prev[prev.length - 1];
                        if (last && last.role === 'user' && last.content === transcript) return prev;
                        return [...prev, { role: 'user', content: transcript }];
                    });
                }
            } else if (role === 'assistant') {
                if (transcriptType === 'partial') {
                    // Live streaming — update the ephemeral assistant message
                    setCurrentMessage(transcript);
                } else if (transcriptType === 'final') {
                    // Commit: clear the streaming bubble and append to messages array (deduplicated)
                    setCurrentMessage('');
                    setMessages(prev => {
                        const last = prev[prev.length - 1];
                        if (last && last.role === 'assistant' && last.content === transcript) return prev;
                        return [...prev, { role: 'assistant', content: transcript }];
                    });
                }
            }
        };

        vapiInstance.on('call-start', onCallStart);
        vapiInstance.on('call-end', onCallEnd);
        vapiInstance.on('speech-start', onSpeechStart);
        vapiInstance.on('speech-end', onSpeechEnd);
        vapiInstance.on('message', onMessage);

        return () => {
            vapiInstance.off('call-start', onCallStart);
            vapiInstance.off('call-end', onCallEnd);
            vapiInstance.off('speech-start', onSpeechStart);
            vapiInstance.off('speech-end', onSpeechEnd);
            vapiInstance.off('message', onMessage);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    // ──────────────────────────────────────────────────────────────────────────

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

            await getVapi().start(ASSISTANT_ID, {
                firstMessage,
                variableValues: {
                    title: book.title, author: book.author, bookId: book._id
                },
                // voice: {
                //     provider: '11labs' as const,
                //     voiceId: getVoice(voice).id,
                //     model: "eleven_turbo_v2_5" as const,
                //     stability: VOICE_SETTINGS.stability,
                //     similarityBoost: VOICE_SETTINGS.similarityBoost,
                //     style: VOICE_SETTINGS.style,
                //     useSpeakerBoost: VOICE_SETTINGS.useSpeakerBoost
                // }

            })

        } catch (e) {
            console.error('Error starting call', e);
            // If the VAPI call failed but a session record was already created,
            // close it immediately so it doesn't skew billing/session data.
            if (sessionIdRef.current) {
                await endVoiceSession(sessionIdRef.current, 0);
                sessionIdRef.current = null;
            }
            setStatus('idle');
            setLimitError('An error occurred. Please try again');
        }
    }
    const stop = async () => {
        isStoppingRef.current = true;
        await getVapi().stop()
    }
    const clearErrors = async () => { }


    return {
        status, isActive, messages, currentMessage, currentUserMessage,
        duration, limitError, start, stop, clearErrors,
        // maxDurationSeconds, remainingSeconds, showTimeWarning,
    }
}

export default useVapi;
