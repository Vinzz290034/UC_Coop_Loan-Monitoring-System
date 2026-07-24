# -*- coding: utf-8 -*-
import os

filepath = r"d:\Documents\Programming\LoanMonitoring\UC_Coop_Loan-Monitoring-System\frontend\src\app\(landing)\page.tsx"

# Read as UTF-8 text (ignoring errors if any)
with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

# Perform string replacements for the garbled text characters
replacements = {
    'â”€': '─',
    'â€”': '—',
    'â€¢': '•',
    'â‚±': '₱',
}

for bad_str, good_str in replacements.items():
    text = text.replace(bad_str, good_str)

# Write back as clean UTF-8
with open(filepath, 'w', encoding='utf-8') as f:
    f.write(text)

print("Encoding replacements complete (text mode)!")
