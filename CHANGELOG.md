# Changelog

All notable changes to this project will be documented in this file.

## [2.4.0] - 2025-01-25

### Added - PrivatMegleren-Inspired Modern Design
- **Complete UI Redesign**: Implemented new PrivatMegleren-inspired layout with mobile-first approach
- **Transparent Navigation**: Sticky navigation with backdrop blur and smooth mobile hamburger menu
- **Fullscreen Hero Section**: Hero with gradient overlay maintaining existing background image
- **Value Proposition Section**: "Hvorfor Boligene?" with 3-column grid showcasing platform benefits
- **Enhanced Tools Grid**: Responsive 2×3 mobile, 3×2 desktop grid with gradient cards and hover effects
- **AI Callout Section**: Dedicated dark section with interactive chat mockup and AI feature showcase
- **Professional Footer**: Comprehensive footer with organized links and branding
- **Smooth Scroll Navigation**: Seamless anchor navigation between sections
- **Modern Button Styling**: Rounded-full buttons with hover scaling and shadow effects

### Changed - Design Implementation
- **Home.tsx**: Complete replacement with new sectioned layout (Hero → Value → Tools → AI → Footer)
- **Component Architecture**: Moved from preview components to main components directory
- **Visual Hierarchy**: PrivatMegleren-style flow with clear section separation
- **Typography**: Enhanced font usage with better size scaling and contrast
- **Color Scheme**: Expanded brown palette usage with gradients and transparency effects
- **Interactive Elements**: Improved hover states, transitions, and micro-interactions

### Enhanced Features
- **Background Integration**: Preserved original livingroom background with improved overlay
- **FINN Integration**: Maintained all existing FINN import functionality within new Hero section
- **Bolig Management**: Enhanced imported boliger display with improved cards and actions
- **AI Features**: Elevated AI assistant presentation with dedicated showcase section
- **Mobile Experience**: 100% mobile-optimized flow with seamless touch interactions
- **Accessibility**: Maintained all tap targets ≥ 44px and safe area support

### Technical Improvements
- **Component Organization**: Clean separation of concerns with modular component structure
- **Performance**: Maintained Lighthouse ≥ 0.9 mobile score with enhanced visuals
- **Responsive Design**: Improved breakpoint usage for optimal cross-device experience
- **Code Quality**: Better component reusability and maintainable architecture

## [2.3.0] - 2025-01-25

### Added
- Mobile-first responsive design across all components
- Safe area padding support for iOS devices
- Tap target utilities ensuring minimum 44x44px touch targets
- Lighthouse CI mobile performance testing (≥ 0.9 score requirement)
- Responsive typography scaling (text-2xl to md:text-4xl)
- Mobile-optimized navigation grid (2 columns on mobile, 4 on desktop)

### Changed
- **Home.tsx**: Converted to mobile-first grid layout with full width on mobile
- **PDFDropzone.tsx**: Updated to full width with vertical stacking on small screens
- **AIBoligWidget.tsx**: Implemented vertical layout stack on mobile (md breakpoint)
- **AIChatInterface.tsx**: Added sticky input with 70vh max height and overflow scroll
- **tailwind.config.js**: Added safe-area utilities and tap-target utilities

### Mobile Optimizations
- Removed all fixed pixel-based widths and heights
- Implemented `break-words` to prevent text overflow
- Added responsive padding (px-4 md:px-6)
- Form inputs now stack vertically on mobile
- Navigation items use proper spacing and tap targets
- Images scale responsively (w-full sm:w-32)
- Buttons include proper min-height and min-width
- Added safe area inset support for notched devices

### Performance
- CI/CD pipeline now includes Lighthouse mobile performance testing
- Mobile performance score must be ≥ 0.9 to pass CI
- Optimized for mobile-first loading and rendering

### Technical Details
- All components use mobile-first Tailwind CSS classes
- Safe area padding: `pl-[env(safe-area-inset-left)]` and `pr-[env(safe-area-inset-right)]`
- Tap targets: All interactive elements minimum 44x44px
- Responsive breakpoints: sm, md, lg for progressive enhancement
- Grid layouts: `grid-cols-2 md:grid-cols-4` pattern throughout
- Typography: Mobile-first sizing with responsive scaling

### Infrastructure
- Added `lhci-mobile.json` configuration for Lighthouse CI
- Updated CI workflow with mobile performance gates
- Automated mobile performance testing on all PRs 