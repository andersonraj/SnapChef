const SHAPE = `Return ONLY JSON in exactly this shape:
{"store_name": string|null, "purchase_date": "YYYY-MM-DD"|null, "total": number|null,
 "items": [{"name": string, "category": "produce"|"dairy"|"meat"|"seafood"|"grains"|"canned"|"frozen"|"condiments"|"spices"|"snacks"|"beverages"|"other",
 "quantity": number, "unit": string, "price": number|null,
 "shelf_life_days": integer|null, "confidence": number between 0 and 1}]}
Use short, plain item names (e.g. "Whole milk", "Cheddar cheese"). Use units like "unit", "g", "ml", "lb", "oz", "L".
shelf_life_days = typical days the item stays good from today when stored properly.`;

export const PROMPTS = {
  fridge: `You are a kitchen assistant. Look at this photo of a fridge, freezer, or pantry shelf.
List every distinct food or drink item you can clearly identify. Estimate quantity.
Do not guess at items you cannot see. Set price, store_name, purchase_date and total to null.
${SHAPE}`,
  receipt: `You are a receipt reader. Extract every grocery line item from this receipt.
Expand abbreviations into real food names. price = the amount paid for that line.
Skip taxes, discounts, bags, deposits and non-food items. Fill store_name, purchase_date and total if visible.
${SHAPE}`,
};
