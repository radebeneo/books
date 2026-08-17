import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, MicOff, Mic } from 'lucide-react';

import { getBookBySlug } from '@/lib/actions/book.actions';
import { voiceOptions, DEFAULT_VOICE } from '@/lib/constants';

interface BookPageProps {
    params: Promise<{ slug: string }>;
}

const BookPage = async ({ params }: BookPageProps) => {
    const { userId } = await auth();
    if (!userId) redirect('/');

    const { slug } = await params;
    const result = await getBookBySlug(slug);

    if (!result.success || !result.data) {
        redirect('/');
    }

    const book = result.data;

    const personaKey = (book.persona ?? DEFAULT_VOICE) as keyof typeof voiceOptions;
    const voiceName = voiceOptions[personaKey]?.name ?? book.persona ?? 'Rachel';

    return (
        <div className="book-page-container">
            <Link href="/" id="back-btn" className="back-btn-floating" aria-label="Back to library">
                <ArrowLeft className="w-5 h-5 text-[var(--text-primary)]" />
            </Link>

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
                            <button id="mic-toggle-btn" className="vapi-mic-btn" aria-label="Toggle microphone" type="button">
                                <MicOff className="w-6 h-6 text-[var(--text-primary)]" />
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
                                <span className="vapi-status-text">0:00 / 15:00</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="transcript-container vapi-transcript-wrapper w-full">
                    <div className="transcript-empty">
                        <Mic className="w-12 h-12 text-[var(--text-muted)] opacity-50 mb-4" />
                        <p className="transcript-empty-text">No conversation yet</p>
                        <p className="transcript-empty-hint">Click the mic button above to start talking</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BookPage;