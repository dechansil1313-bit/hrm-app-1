// /app/page.tsx
import Link from 'next/link';
import Image from 'next/image';

export default function LandingPage() {
  return (
    <main style={{ padding: '2rem', textAlign: 'center' }}>
      <>
      <div className="absolute inset-0">
        <Image src="/hero.jpg" alt="hero image" fill className="object-cover object-center w-full h-full opacity-80" />
      </div>
      <div className='relative flex flex-col items-center justify-center min-h-screen bg-gray-white text-black font-bold'>
      <h1 className='text-5xl mb-8'>Welcome to HRMS Cloud</h1>
      <h3 className='text-3xl'>The ultimate solution for team management,</h3>    
      <h3 className='text-3xl mb-8'>payroll, and attendance.</h3>
      {/* Button to go to your dashboard */}
      <Link href="/dashboard">
        <button className='px-2 py-3 rounded-lg border border-slate-200 bg-gray-300 text-sm font-medium text-slate-700 shadow-sm hover:bg-gray-200 active:scale-95 transition-all hover:cursor-pointer' >
          Go to Dashboard
        </button>
      </Link>        
      </div>
      </>
      

    </main>
  );
}
