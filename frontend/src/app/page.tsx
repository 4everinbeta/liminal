import { Metadata } from 'next';
import TaskForm from '@/components/TaskForm';

export const metadata: Metadata = {
    title: 'Home',
    description: 'Home page',
};

export default function Home() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-24">
            <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
                <h1 className="text-4xl font-bold mb-4">Home Page</h1>
                <p>Welcome to the home page.</p>
                <div className="mt-4">
                    <TaskForm />
                </div>
            </div>
        </main>
    );
}
