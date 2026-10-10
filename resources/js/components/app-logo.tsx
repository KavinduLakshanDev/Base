interface AppLogoProps {
    companyCode?: string;
}

export default function AppLogo({ companyCode }: AppLogoProps) {
    // Logo mapping allows adding more brands by company code.
    // Add a new entry here with the matching company_code -> logo path.
    const logoMap: Record<string, { src: string; alt: string }> = {
        VIS001: { src: '/images/Vismass-logo.png', alt: 'Vismass' },
        MAL001: { src: '/images/malibu-logo.png', alt: 'Malibu' },
        MASS: { src: '/images/mass-logo.svg', alt: 'MASS' },
    };

    const key = (companyCode || 'VIS001').toUpperCase();
    const logo = logoMap[key] ?? logoMap['VIS001'];

    return <img src={logo.src} alt={logo.alt} className="h-10 w-auto" />;
}
