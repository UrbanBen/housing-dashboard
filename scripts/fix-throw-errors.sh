#!/bin/bash

# Fix all cards that throw errors instead of setting error state
# This prevents the app from crashing when data is missing

files=(
  "src/components/dashboard/AgeBySexCard.tsx"
  "src/components/dashboard/CountryOfBirthCard.tsx"
  "src/components/dashboard/DwellingTypeCard.tsx"
  "src/components/dashboard/IncomeCard.tsx"
  "src/components/dashboard/CitizenshipCard.tsx"
  "src/components/dashboard/CitizenshipTrendCard.tsx"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "Fixing $file..."

    # Replace "throw new Error" with "setError() and return"
    # This is a safe replacement pattern for error handling in React components

    sed -i '' \
      's/throw new Error(result\.error || \(.*\));$/setError(result.error || \1);\n          return;/g' \
      "$file"

    echo "✓ Fixed $file"
  fi
done

echo ""
echo "All files fixed!"
