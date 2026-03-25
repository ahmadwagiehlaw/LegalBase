export const Utils = {
    formatDate: (timestamp) => {
        if (!timestamp) return '';
        // Handle Firestore Timestamp
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return new Intl.DateTimeFormat('ar-EG', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        }).format(date);
    },

    // File Validation and Compression Pre-check
    validateFile: (file, maxSizeMB = 5, allowedTypes = ['application/pdf', 'image/jpeg', 'image/png']) => {
        const errors = [];
        
        // 1. Check type
        if (!allowedTypes.includes(file.type)) {
            errors.push('نوع الملف غير مسموح به. يرجى رفع PDF أو صور فقط.');
        }
        
        // 2. Check size
        const sizeMB = file.size / (1024 * 1024);
        if (sizeMB > maxSizeMB) {
            errors.push(`حجم الملف كبير جداً. الحد الأقصى هو ${maxSizeMB} ميجابايت.`);
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    },

    generateId: () => {
        return Math.random().toString(36).substring(2, 15);
    }
};
