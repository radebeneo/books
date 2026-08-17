import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, MicOff, Mic } from 'lucide-react';

import { getBookBySlug } from '@/lib/actions/book.actions';
import { voiceOptions, DEFAULT_VOICE } from '@/lib/constants';
import VapiControls from '@/components/VapiControls';

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

            <VapiControls book={book} />
        </div>
    );
};

export default BookPage;