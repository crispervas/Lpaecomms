# Mashup amd WEB Technology

## Comparative: Web 1.0, Web 2.0, Web 3.0, and Web 4.0

| Aspect | Web 1.0 | Web 2.0 | Web 3.0 | Web 4.0 |
|---|---|---|---|---|
| Common name | Static web | Social web | Semantic / decentralized web | Intelligent web |
| Approximate period | 1990-2004 | 2004-present | 2010-present | In development |
| User role | Reader only | Creator and consumer | Data owner and participant | User connected to intelligent systems |
| Content type | Fixed pages | Blogs, social media, videos | Connected data, blockchain, AI | Personalized and intelligent experiences |
| Interaction | Very low | High | High and more automated | Very high, predictive, and real-time |
| Key technology | Basic HTML, links | Social networks, web apps, cloud computing | AI, blockchain, semantic web | Advanced AI, IoT, intelligent assistants |
| Examples | Informational websites, old online encyclopedias | Facebook, YouTube, Wikipedia, Instagram | Cryptocurrencies, NFTs, dApps, AI assistants | Smart homes, connected cars, personalized AI |
| Main advantage | Access to information | Participation and collaboration | Data control and automation | Constant personalization and intelligence |
| Main disadvantage | Little interaction | Dependence on big platforms | Complexity and limited mass adoption | Privacy risks and technological dependence |

## Summary

Web 1.0 was for reading, Web 2.0 is for participating, Web 3.0 seeks decentralization and connected data, and Web 4.0 aims for a more intelligent, predictive, and personalized web.

## What Is a Mashup in Software Development?

A mashup is mixing tools, data, or services from different applications to create a new solution.


## MASHUP 1 — Products for Sale + Location

36) Identify mashup content according to organisational requirements

It was identified that LPA needs to show customers the physical location of available products (stores/warehouses), as an organisational requirement to improve the shopping experience and provide greater transparency around product availability and proximity.

37) Determine sources of content required for mashup

Content | Source
|---|---|
Product data |	LPA internal database
Interactive map |	Leaflet (open-source JS library for maps)


38) Determine and document mashup interface requirements

Interactive map embedded in the catalogue/store page
One marker per product, placed according to latitude/longitude
Clicking a marker shows a popup with the product name, price, and image
Responsive design (the map must adapt to mobile screens)
Acceptable loading time; the map must not block the rest of the page while loading


## MASHUP 2 — Products + Currency Converter

36) Identify mashup content according to organisational requirements

It was identified that LPA will have international customers, so it is required to display product prices converted into the most common transaction currencies (e.g. GBP, USD, AUD), as an organisational requirement to make purchasing decisions easier for overseas customers.

37) Determine sources of content required for mashup

Content | Source
|---|---|
Base product price | LPA internal database
Real-time exchange rates   |	API Ninjas – Currency Convert (api.api-ninjas.com/v1/convertcurrency)

38) Determine and document mashup interface requirements

Currency dropdown selector displayed next to the product price
The price updates dynamically when the selected currency changes, without reloading the page
Loading indicator while waiting for the API response
Error handling: if the API does not respond, display the price in the original currency with a warning message
The API key (X-Api-Key) must be kept in an environment variable, never exposed in public code


## MASHUP 3 — Secure Password Checker

36) Identify mashup content according to organisational requirements

It was identified that, during the registration process, users sometimes create weak passwords or ones that have already been exposed in previous data breaches. As an organisational security requirement, LPA needs to warn users in real time if their password has been compromised, promoting the use of stronger passwords.

37) Determine sources of content required for mashup

Content | Source
|---|---|
Registration form |	LPA internal system
Password security status	| Have I Been Pwned – Pwned Passwords API GET https://api.pwnedpasswords.com/range/{first_5_characters_of_SHA1_hash}

38) Determine and document mashup interface requirements

Password input field on the registration form
Password strength indicator (visual, e.g. colour bar)
Warning message if the password appears in the breach database
Recommendation/suggestion to create a stronger password if rejected
Privacy requirement: never send the full password to the API; only the first 5 characters of the SHA-1 hash (k-anonymity)


