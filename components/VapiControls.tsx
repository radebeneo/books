'use client';

import { Mic, MicOff } from 'lucide-react';
import useVapi from '@/hooks/useVapi';
import { IBook } from '@/types';
import Image from 'next/image';
import { voiceOptions, DEFAULT_VOICE } from '@/lib/constants';
import Transcript from '@/components/Transcript';



const VapiControls = ({ book }: { book: IBook }) => {

    const personaKey = (book.persona ?? DEFAULT_VOICE) as keyof typeof voiceOptions;

    const voiceName = voiceOptions[personaKey]?.name ?? book.persona ?? 'Rachel';

    const { status, isActive, messages, currentMessage, currentUserMessage, duration, limitError, start, stop, clearErrors, } =
        useVapi(book)

    return (
        <>
            <div className="vapi-main-container gap-4">
                <div className="vapi-header-card w-full">
                    <div className="vapi-cover-wrapper">
                        {book.coverURL ? (
                            <Image
                                src={book.coverURL}
                                alt={`Cover of ${book.title}`}
                                width={120}
                                height={180}
                                className="vapi-cover-image"
                                priority
                            />
                        ) : (
                            <div className="vapi-cover-image bg-[var(--bg-primary)] flex items-center justify-center">
                                <Mic className="w-10 h-10 text-[var(--text-muted)] opacity-40" />
                            </div>
                        )}
                        <div className="vapi-mic-wrapper">
                            {/* Pulsating ring — visible only when AI is speaking or thinking */}
                            {(status === 'speaking' || status === 'thinking') && (
                                <span className="vapi-pulse-ring" aria-hidden="true" />
                            )}
                            <button onClick={isActive ? stop : start} disabled={status === 'connecting'} id="mic-toggle-btn" className="vapi-mic-btn" aria-label={isActive ? 'Stop voice session' : 'Start voice session'} aria-pressed={isActive} type="button">
                                {isActive
                                    ? <Mic className="w-6 h-6 text-[var(--text-primary)]" />
                                    : <MicOff className="w-6 h-6 text-[var(--text-primary)]" />
                                }
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 flex-1 min-w-0">
                        <h1 id="book-title" className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] leading-tight font-serif line-clamp-2">
                            {book.title}
                        </h1>
                        <p className="text-base text-[var(--text-secondary)] font-medium">by {book.author}</p>

                        <div className="flex flex-wrap gap-2 mt-1">
                            <div id="status-pill" className="vapi-status-indicator">
                                <span className="vapi-status-dot vapi-status-dot-ready" />
                                <span className="vapi-status-text">Ready</span>
                            </div>
                            <div id="voice-pill" className="vapi-status-indicator">
                                <span className="vapi-status-text">Voice: {voiceName}</span>
                            </div>
                            <div id="timer-pill" className="vapi-status-indicator">
                                <span className="vapi-status-text">
                                    {`${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, '0')} / 15:00`}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="vapi-transcript-wrapper w-full">
                    <Transcript
                        messages={messages}
                        currentMessage={currentMessage}
                        currentUserMessage={currentUserMessage}
                    />
                </div>

            </div>
        </>
    );
};

export default VapiControls