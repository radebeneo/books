import { NextResponse } from "next/server";
import { searchBookSegments } from "@/lib/actions/book.actions";

interface VapiToolCall {
    id: string;
    type: "function";
    function: {
        name: string;
        arguments: string;
    };
}

interface VapiRequestBody {
    message: {
        type: string;
        toolCallList: VapiToolCall[];
    };
}

export async function POST(request: Request): Promise<NextResponse> {
    try {
        const body = (await request.json()) as VapiRequestBody;

        const toolCallList = body?.message?.toolCallList ?? [];

        const results = await Promise.all(
            toolCallList.map(async (toolCall) => {
                if (toolCall.function.name !== "search_book") {
                    return {
                        toolCallId: toolCall.id,
                        result: "Unknown tool call.",
                    };
                }

                let args: { bookId?: string; query?: string };
                try {
                    args = JSON.parse(toolCall.function.arguments);
                } catch {
                    return {
                        toolCallId: toolCall.id,
                        result: "Invalid arguments provided.",
                    };
                }

                const { bookId, query } = args;

                if (!bookId || !query) {
                    return {
                        toolCallId: toolCall.id,
                        result: "Missing required parameters: bookId and query.",
                    };
                }

                const searchResult = await searchBookSegments(bookId, query, 3);

                if (!searchResult.success || !searchResult.data || searchResult.data.length === 0) {
                    return {
                        toolCallId: toolCall.id,
                        result: "No information found about this topic.",
                    };
                }

                const combinedContent = searchResult.data
                    .map((segment) => segment.content)
                    .join("\n\n");

                return {
                    toolCallId: toolCall.id,
                    result: combinedContent,
                };
            })
        );

        return NextResponse.json({ results });
    } catch (e) {
        const message = e instanceof Error ? e.message : "An unknown error occurred";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
