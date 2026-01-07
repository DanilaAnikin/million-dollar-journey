import React from 'react';
import Image from 'next/image';

interface LogoProps {
  className?: string;
  size?: number;
}

export const LogoTrading212: React.FC<LogoProps> = ({ className }) => {
  return (
    <Image
      src="/logos/trading212.jpg"
      alt="Trading 212 Logo"
      width={32}
      height={32}
      className={`rounded-md ${className || ''}`}
    />
  );
};

export const LogoXTB: React.FC<LogoProps> = ({ className }) => {
  return (
    <Image
      src="/logos/xtb.jpg"
      alt="XTB Logo"
      width={32}
      height={32}
      className={`rounded-md ${className || ''}`}
    />
  );
};

export const LogoGoCardless: React.FC<LogoProps> = ({ className }) => {
  return (
    <Image
      src="/logos/gocardless.jpg"
      alt="GoCardless Logo"
      width={32}
      height={32}
      className={`rounded-md ${className || ''}`}
    />
  );
};

export const LogoEtoro: React.FC<LogoProps> = ({ className }) => {
  return (
    <Image
      src="/logos/etoro.jpg"
      alt="eToro Logo"
      width={32}
      height={32}
      className={`rounded-md ${className || ''}`}
    />
  );
};

export const LogoDegiro: React.FC<LogoProps> = ({ className }) => {
  return (
    <Image
      src="/logos/degiro.jpg"
      alt="DEGIRO Logo"
      width={32}
      height={32}
      className={`rounded-md ${className || ''}`}
    />
  );
};

export const LogoIBKR: React.FC<LogoProps> = ({ className }) => {
  return (
    <Image
      src="/logos/interactivebrokers.jpg"
      alt="Interactive Brokers Logo"
      width={32}
      height={32}
      className={`rounded-md ${className || ''}`}
    />
  );
};

export const LogoRevolut: React.FC<LogoProps> = ({ className, size = 32 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Revolut - Black background with white R symbol */}
      <rect width="48" height="48" rx="8" fill="#0A0A0A" />
      {/* Stylized R mark */}
      <path
        d="M14 12h10c3.3 0 6 2.7 6 6 0 2.4-1.4 4.5-3.5 5.5L32 32h-6l-5-8h-3v8h-4V12zm4 4v6h6c1.1 0 2-.9 2-2v-2c0-1.1-.9-2-2-2h-6z"
        fill="white"
      />
      {/* Accent swoosh */}
      <path
        d="M28 24c2.2 0 4 1.8 4 4 0 2.2-1.8 4-4 4"
        stroke="#0075FF"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
};

export const LogoKB: React.FC<LogoProps> = ({ className, size = 32 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Komerční banka - Blue background with white KB */}
      <rect width="48" height="48" rx="8" fill="#003DA5" />
      <g fill="white" fontFamily="Arial, sans-serif" fontWeight="bold">
        {/* K */}
        <path d="M10 12h4v8l6-8h5l-7 9 7 11h-5l-6-9v9h-4V12z" />
        {/* B */}
        <path d="M28 12h8c2.2 0 4 1.8 4 4v2c0 1.5-.8 2.8-2 3.5 1.2.7 2 2 2 3.5v2c0 2.2-1.8 4-4 4h-8V12zm4 4v5h4c.6 0 1-.4 1-1v-3c0-.6-.4-1-1-1h-4zm0 9v5h4c.6 0 1-.4 1-1v-3c0-.6-.4-1-1-1h-4z" />
      </g>
    </svg>
  );
};

export const LogoRaiffeisen: React.FC<LogoProps> = ({ className, size = 32 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Raiffeisen - Yellow background with black Giebelkreuz */}
      <rect width="48" height="48" rx="8" fill="#FFED00" />
      {/* Giebelkreuz (crossed gables) symbol */}
      <g fill="#000000">
        {/* Left gable */}
        <path d="M12 24L18 14L24 24L20 24L20 34L16 34L16 24z" />
        {/* Right gable */}
        <path d="M36 24L30 14L24 24L28 24L28 34L32 34L32 24z" />
        {/* Horizontal bar */}
        <rect x="16" y="22" width="16" height="4" />
      </g>
    </svg>
  );
};
