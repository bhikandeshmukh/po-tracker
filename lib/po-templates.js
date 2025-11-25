// lib/po-templates.js
// PO Template management

const TEMPLATE_STORAGE_KEY = 'po_templates';

/**
 * Get all PO templates from localStorage
 */
export function getPOTemplates() {
    if (typeof window === 'undefined') return [];
    
    try {
        const templates = localStorage.getItem(TEMPLATE_STORAGE_KEY);
        return templates ? JSON.parse(templates) : [];
    } catch (error) {
        console.error('Error loading templates:', error);
        return [];
    }
}

/**
 * Save a new PO template
 */
export function savePOTemplate(name, formData) {
    if (typeof window === 'undefined') return false;
    
    try {
        const templates = getPOTemplates();
        const newTemplate = {
            id: `template_${Date.now()}`,
            name,
            createdAt: new Date().toISOString(),
            data: {
                vendorId: formData.vendorId,
                vendorWarehouseId: formData.vendorWarehouseId,
                notes: formData.notes || '',
                items: formData.items.map(item => ({
                    sku: item.sku,
                    itemName: item.itemName,
                    mrp: item.mrp,
                    price: item.price,
                    gstRate: item.gstRate || 18,
                    poQty: item.poQty || 1
                }))
            }
        };
        
        templates.push(newTemplate);
        localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(templates));
        return true;
    } catch (error) {
        console.error('Error saving template:', error);
        return false;
    }
}

/**
 * Delete a PO template
 */
export function deletePOTemplate(templateId) {
    if (typeof window === 'undefined') return false;
    
    try {
        const templates = getPOTemplates();
        const filtered = templates.filter(t => t.id !== templateId);
        localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(filtered));
        return true;
    } catch (error) {
        console.error('Error deleting template:', error);
        return false;
    }
}

/**
 * Load a template into form data
 */
export function loadPOTemplate(templateId) {
    const templates = getPOTemplates();
    const template = templates.find(t => t.id === templateId);
    
    if (!template) return null;
    
    return {
        poNumber: '',
        vendorId: template.data.vendorId,
        vendorWarehouseId: template.data.vendorWarehouseId,
        poDate: new Date().toISOString().substring(0, 10),
        expectedDelivery: '',
        notes: template.data.notes,
        status: 'draft',
        items: template.data.items.map(item => ({
            ...item,
            qtySent: 0,
            qtyPending: item.poQty,
            totalPrice: item.poQty * item.price
        }))
    };
}

/**
 * Export template to JSON file
 */
export function exportTemplate(template) {
    const dataStr = JSON.stringify(template, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `po-template-${template.name.replace(/\s+/g, '-')}.json`;
    link.click();
    URL.revokeObjectURL(url);
}

/**
 * Import template from JSON file
 */
export function importTemplate(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const template = JSON.parse(e.target.result);
                
                // Validate template structure
                if (!template.name || !template.data) {
                    reject(new Error('Invalid template format'));
                    return;
                }
                
                // Add to templates
                const templates = getPOTemplates();
                template.id = `template_${Date.now()}`;
                template.createdAt = new Date().toISOString();
                templates.push(template);
                localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(templates));
                
                resolve(template);
            } catch (error) {
                reject(error);
            }
        };
        
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}
