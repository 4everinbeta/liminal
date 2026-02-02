import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Board',
    description: 'Task board',
};

export default function Board() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-24">
            <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
                <h1 className="text-4xl font-bold mb-4">Board</h1>
                <p>This is the task board.</p>
            </div>
        </main>
    );
}