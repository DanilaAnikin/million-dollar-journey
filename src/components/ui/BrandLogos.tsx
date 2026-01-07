import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

export const LogoTrading212: React.FC<LogoProps> = ({ className, size = 32 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Trading212 - Blue rectangular badge with white text */}
      <rect width="48" height="48" rx="8" fill="#4169E1" />
      <path
        d="M10 16h4v-2h-8v2h4v10h2V16zm8 0c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2v2h-2v-2h-4v8h4v-2h2v2c0 1.1-.9 2-2 2h-4c-1.1 0-2-.9-2-2v-8z"
        fill="white"
      />
      <path
        d="M10 32v-2h2.5l-2.5-3.5v-1.5h6v2h-2.5l2.5 3.5v1.5h-6zm6 0v-6h4c1.1 0 2 .9 2 2v2c0 1.1-.9 2-2 2h-4zm2-2h2v-2h-2v2zm6 2v-6h2v2h2v-2h2v6h-2v-2h-2v2h-2z"
        fill="white"
      />
      <path
        d="M32 18h2v-4h2v4h2v2h-2v4h-2v-4h-2v-2zm6 8v-6h2v6h2v2h-6v-2h2z"
        fill="#FFD700"
      />
      <path
        d="M32 32v-6h4c1.1 0 2 .9 2 2v2c0 1.1-.9 2-2 2h-4zm2-2h2v-2h-2v2z"
        fill="#FFD700"
      />
    </svg>
  );
};

export const LogoXTB: React.FC<LogoProps> = ({ className, size = 32 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* XTB - Bold red background with white text */}
      <rect width="48" height="48" rx="8" fill="#DC143C" />
      <g fill="white">
        {/* X */}
        <path d="M10 14l6 8-6 8h3.5l4.5-6 4.5 6h3.5l-6-8 6-8h-3.5l-4.5 6-4.5-6H10z" />
        {/* T */}
        <path d="M28 14v3h4v13h3V17h4v-3H28z" />
        {/* B */}
        <path d="M10 36v16h8c2.2 0 4-1.8 4-4v-2c0-1.5-.8-2.8-2-3.5.8-.6 1.3-1.6 1.3-2.7v-1.6c0-2.2-1.8-4.2-4-4.2h-7.3zm3 3h4c.6 0 1 .4 1 1v1.5c0 .6-.4 1-1 1h-4V39zm0 6.5h4.5c.8 0 1.5.7 1.5 1.5v2c0 .8-.7 1.5-1.5 1.5H13v-5z" transform="translate(18 -21)" />
      </g>
    </svg>
  );
};

export const LogoGoCardless: React.FC<LogoProps> = ({ className, size = 32 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* GoCardless - Teal G symbol */}
      <circle cx="24" cy="24" r="20" fill="#1EAEA5" />
      <path
        d="M24 10c-7.732 0-14 6.268-14 14s6.268 14 14 14c3.866 0 7.36-1.567 9.899-4.101L30.5 30.5c-1.69 1.69-4.024 2.735-6.6 2.735-5.156 0-9.335-4.179-9.335-9.335S18.744 14.565 24 14.565c2.576 0 4.91 1.045 6.6 2.735L34 13.9C31.461 11.367 27.866 10 24 10z"
        fill="white"
      />
      <rect x="24" y="20" width="10" height="4.5" fill="white" />
    </svg>
  );
};

export const LogoEtoro: React.FC<LogoProps> = ({ className, size = 32 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* eToro - Green bull horns symbol */}
      <rect width="48" height="48" rx="8" fill="#52C41A" />
      <g fill="white">
        {/* Left horn */}
        <path d="M14 24c0-5.5 2-10 6-12v10c0 2 1 4 3 4s3-2 3-4V12c4 2 6 6.5 6 12" />
        {/* Bull head outline */}
        <ellipse cx="24" cy="28" rx="10" ry="8" />
        {/* Eyes */}
        <circle cx="20" cy="27" r="1.5" fill="#52C41A" />
        <circle cx="28" cy="27" r="1.5" fill="#52C41A" />
        {/* Nose */}
        <ellipse cx="24" cy="31" rx="3" ry="2" fill="#52C41A" />
      </g>
    </svg>
  );
};

export const LogoDegiro: React.FC<LogoProps> = ({ className, size = 32 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* DEGIRO - Black background with orange accent */}
      <rect width="48" height="48" rx="8" fill="#1A1A1A" />
      {/* Orange accent bar */}
      <rect y="0" width="48" height="8" fill="#FF6B00" />
      {/* DEGIRO text */}
      <g fill="white" fontSize="10" fontFamily="Arial, sans-serif" fontWeight="bold">
        <text x="6" y="28">DEGIRO</text>
      </g>
      {/* Simplified using path for "DEGIRO" */}
      <path
        d="M6 22h4c2.2 0 4 1.8 4 4s-1.8 4-4 4H6v-8zm2 2v4h2c1.1 0 2-.9 2-2s-.9-2-2-2H8zm6-2h6v2h-4v1h3v2h-3v1h4v2h-6v-8zm10 0h4c1.1 0 2 .9 2 2v1h-2v-1h-4v4h4v-1h2v1c0 1.1-.9 2-2 2h-4v-8zm8 0h2v8h-2v-8zm4 0h4c1.1 0 2 .9 2 2v2c0 1.1-.9 2-2 2h-2v2h-2v-8zm2 2v2h2v-2h-2z"
        fill="white"
      />
    </svg>
  );
};

export const LogoIBKR: React.FC<LogoProps> = ({ className, size = 32 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Interactive Brokers - Red figure on white */}
      <rect width="48" height="48" rx="8" fill="white" />
      <rect width="48" height="48" rx="8" stroke="#E0E0E0" strokeWidth="1" />
      {/* Stylized running figure */}
      <g fill="#DC143C">
        {/* Head */}
        <circle cx="18" cy="14" r="3" />
        {/* Body leaning forward */}
        <path d="M18 18c-1 0-2 .5-2 1.5v6c0 1 1 1.5 2 1.5h8c2 0 4 1 4 3v2c0 1-1 2-2 2h-4c-1 0-2-1-2-2v-2h3v2h3v-2c0-1-1-2-3-2h-7c-2 0-4-1-4-3v-6c0-2 2-3 4-3z" />
        {/* Leading leg extended */}
        <path d="M22 27l6-3v6l-2 8h-3l1-8-2-3z" />
        {/* Trailing leg */}
        <path d="M18 27l-4 2v6l2 4h3l-1-5v-7z" />
        {/* Leading arm */}
        <path d="M20 18l8 2 2-4-8-2-2 4z" />
      </g>
    </svg>
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
