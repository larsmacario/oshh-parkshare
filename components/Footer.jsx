import React from 'react';
import Link from 'next/link';

export default function Footer() {
    return (
        <footer className="px-6 py-8 border-t border-orendt-gray-200 bg-orendt-white mt-auto flex flex-col md:flex-row items-center justify-center gap-3 md:gap-6">
            <div className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-orendt-black" />
                <span className="font-display text-[10px] font-bold tracking-[0.15em] uppercase text-orendt-gray-500">
                    Orendt Studios – ParkShare 2026
                </span>
            </div>

            <div className="hidden md:block w-px h-3 bg-orendt-gray-200" />

            <a
                href="https://www.orendtstudios.com/imprint/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-display text-[10px] font-bold tracking-[0.15em] uppercase text-orendt-gray-400 hover:text-orendt-black transition-colors"
            >
                Impressum
            </a>

            <div className="hidden md:block w-px h-3 bg-orendt-gray-200" />

            <Link
                href="/datenschutz"
                className="font-display text-[10px] font-bold tracking-[0.15em] uppercase text-orendt-gray-400 hover:text-orendt-black transition-colors"
            >
                Datenschutz
            </Link>
        </footer>
    );
}
