"""
models/classifier/train_classifier.py

TF-IDF + Voting(MultinomialNB + LogisticRegression) classifier.

Dataset: ~620 curated examples across 9 expense + 6 income categories.
Inspired by real Kaggle personal-finance datasets (SPENDNG, SPENDIN, UCI bank),
augmented with Indian-context descriptions.

Key improvements over previous version:
  - 2.5x more examples (250 → 620+)
  - 50+ examples per expense category
  - Better coverage of single-word short forms users actually type
  - Income category examples for salary, freelance, business, investment

HOW TO RUN:
  cd ai-engine && python models/classifier/train_classifier.py
"""

import sys
import logging
import joblib
from pathlib import Path
from collections import Counter

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import VotingClassifier
from sklearn.pipeline import Pipeline
from sklearn.model_selection import cross_val_score, StratifiedKFold
from sklearn.metrics import classification_report

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from utils.preprocessor import clean_text

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

MODEL_DIR  = Path(__file__).parent
MODEL_PATH = MODEL_DIR / "model.pkl"

"""
models/classifier/train_classifier.py

Advanced TF-IDF + Voting Classifier
----------------------------------
Classes:
9 Expense + 6 Income categories

Upgrades:
- Better preprocessing compatibility
- Removed deprecated multi_class warning
- Added char ngrams for typo robustness
- Added confidence diagnostics
- Better CV reporting
- Future-ready metadata save
"""

import sys
import json
import logging
import joblib
from pathlib import Path
from collections import Counter

import numpy as np
from sklearn.pipeline import Pipeline, FeatureUnion
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import VotingClassifier
from sklearn.model_selection import StratifiedKFold, cross_val_score
from sklearn.metrics import classification_report

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from utils.preprocessor import clean_text


# ─────────────────────────────────────────────
# Config
# ─────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

MODEL_DIR = Path(__file__).parent
MODEL_PATH = MODEL_DIR / "model.pkl"
META_PATH = MODEL_DIR / "meta.json"


# ─────────────────────────────────────────────
# Dataset Loader
# ─────────────────────────────────────────────
def get_training_data():
    """
    Keep your existing dataset block here unchanged.
    """
    data = [
        # ═══════════════════════════════════════════════
        # FOOD  (~65 examples)
        # ═══════════════════════════════════════════════
        # Single-word / very short
        ("coffee",                              "food"),
        ("chai",                                "food"),
        ("lunch",                               "food"),
        ("dinner",                              "food"),
        ("breakfast",                           "food"),
        ("snacks",                              "food"),
        ("groceries",                           "food"),
        ("grocery",                             "food"),
        ("fruits",                              "food"),
        ("vegetables",                          "food"),
        ("milk",                                "food"),
        ("bread",                               "food"),
        ("eggs",                                "food"),
        ("rice",                                "food"),
        ("dal",                                 "food"),
        ("biryani",                             "food"),
        ("pizza",                               "food"),
        ("burger",                              "food"),
        ("juice",                               "food"),
        ("tea",                                 "food"),
        # Phrases — delivery apps
        ("Zomato order",                        "food"),
        ("Swiggy dinner",                       "food"),
        ("Blinkit grocery",                     "food"),
        ("Zepto instant delivery",              "food"),
        ("Swiggy Instamart",                    "food"),
        ("Uber Eats order",                     "food"),
        ("Dunzo grocery delivery",              "food"),
        # Phrases — restaurants / fast food
        ("McDonald's burger",                   "food"),
        ("KFC chicken meal",                    "food"),
        ("Pizza Dominos",                       "food"),
        ("Subway sandwich",                     "food"),
        ("Burger King combo",                   "food"),
        ("Biryani Behrouz",                     "food"),
        ("Meghana Foods dinner",                "food"),
        ("MTR restaurant lunch",                "food"),
        ("Udupi restaurant",                    "food"),
        ("Darshini breakfast",                  "food"),
        ("Chai point coffee",                   "food"),
        ("Starbucks latte",                     "food"),
        ("Costa Coffee",                        "food"),
        ("Café Coffee Day",                     "food"),
        ("Street food chaat",                   "food"),
        # Phrases — supermarkets
        ("Grocery shopping BigBazaar",          "food"),
        ("D-Mart groceries",                    "food"),
        ("Reliance Fresh vegetables",           "food"),
        ("More supermarket",                    "food"),
        ("Spencer's retail",                    "food"),
        ("Supermarket weekly groceries",        "food"),
        ("Vegetables and fruits market",        "food"),
        ("Milk and bread daily",                "food"),
        ("Weekly vegetable market",             "food"),
        # Misc food
        ("Lunch office canteen",                "food"),
        ("Dinner takeaway",                     "food"),
        ("Morning coffee",                      "food"),
        ("Office canteen",                      "food"),
        ("Evening snacks",                      "food"),
        ("Bakery cake",                         "food"),
        ("Ice cream parlour",                   "food"),
        ("Fresh juice bar",                     "food"),
        ("Eating out",                          "food"),
        ("Restaurant bill",                     "food"),
        ("Food delivery",                       "food"),
        ("Canteen meal",                        "food"),
        ("Mess fees",                           "food"),

        # ═══════════════════════════════════════════════
        # TRANSPORT  (~65 examples)
        # ═══════════════════════════════════════════════
        # Single-word
        ("cab",                                 "transport"),
        ("taxi",                                "transport"),
        ("auto",                                "transport"),
        ("rickshaw",                            "transport"),
        ("petrol",                              "transport"),
        ("diesel",                              "transport"),
        ("fuel",                                "transport"),
        ("bus",                                 "transport"),
        ("metro",                               "transport"),
        ("train",                               "transport"),
        ("flight",                              "transport"),
        ("parking",                             "transport"),
        ("toll",                                "transport"),
        ("ferry",                               "transport"),
        # App-based
        ("Uber ride",                           "transport"),
        ("Ola cab",                             "transport"),
        ("Rapido bike",                         "transport"),
        ("Rapido auto",                         "transport"),
        ("InDrive taxi",                        "transport"),
        ("Namma Yatri ride",                    "transport"),
        ("BluSmart cab",                        "transport"),
        # Public transport
        ("BMTC bus pass",                       "transport"),
        ("DTC bus monthly pass",                "transport"),
        ("Metro card recharge",                 "transport"),
        ("Namma Metro recharge",                "transport"),
        ("IRCTC train ticket",                  "transport"),
        ("Local train pass",                    "transport"),
        ("Bus ticket",                          "transport"),
        # Flights
        ("IndiGo flight ticket",                "transport"),
        ("SpiceJet flight",                     "transport"),
        ("Air India ticket",                    "transport"),
        ("Vistara flight booking",              "transport"),
        ("Airport cab",                         "transport"),
        ("Airport transfer",                    "transport"),
        # Fuel
        ("Petrol fill up",                      "transport"),
        ("Petrol station",                      "transport"),
        ("Diesel fill car",                     "transport"),
        ("CNG refill",                          "transport"),
        ("Fuel cost",                           "transport"),
        # Vehicle maintenance
        ("Bike service Honda",                  "transport"),
        ("Car service centre",                  "transport"),
        ("Tyre puncture repair",                "transport"),
        ("Car wash",                            "transport"),
        ("Vehicle insurance",                   "transport"),
        ("Car EMI",                             "transport"),
        ("Bike maintenance",                    "transport"),
        # Parking / toll
        ("Parking fees mall",                   "transport"),
        ("Toll booth highway",                  "transport"),
        ("FASTag recharge",                     "transport"),
        # Misc
        ("Cab to office",                       "transport"),
        ("Cab from airport",                    "transport"),
        ("Outstation cab Goa",                  "transport"),
        ("Intercity bus ticket",                "transport"),
        ("Uber pool",                           "transport"),
        ("Auto rickshaw fare",                  "transport"),
        ("Monthly cab booking",                 "transport"),
        ("Ride share",                          "transport"),
        ("Commute cost",                        "transport"),
        ("Travel to work",                      "transport"),

        # ═══════════════════════════════════════════════
        # UTILITIES  (~60 examples)
        # ═══════════════════════════════════════════════
        # Single-word
        ("recharge",                            "utilities"),
        ("rent",                                "utilities"),
        ("electricity",                         "utilities"),
        ("internet",                            "utilities"),
        ("wifi",                                "utilities"),
        ("broadband",                           "utilities"),
        ("gas",                                 "utilities"),
        ("maintenance",                         "utilities"),
        # Mobile / internet
        ("Jio prepaid recharge",                "utilities"),
        ("Airtel recharge",                     "utilities"),
        ("Vi mobile recharge",                  "utilities"),
        ("BSNL recharge",                       "utilities"),
        ("Postpaid mobile bill",                "utilities"),
        ("Mobile bill payment",                 "utilities"),
        ("Phone recharge",                      "utilities"),
        ("Jio fibre bill",                      "utilities"),
        ("Airtel xStream fiber",                "utilities"),
        ("ACT broadband bill",                  "utilities"),
        ("Excitel internet",                    "utilities"),
        ("Wifi bill",                           "utilities"),
        ("Broadband monthly",                   "utilities"),
        # Electricity / water
        ("Electricity bill BESCOM",             "utilities"),
        ("BWSSB water bill",                    "utilities"),
        ("MSEDCL electricity",                  "utilities"),
        ("Electricity bill monthly",            "utilities"),
        ("Water bill",                          "utilities"),
        ("Power bill",                          "utilities"),
        # Gas
        ("Gas cylinder booking",                "utilities"),
        ("LPG refill",                          "utilities"),
        ("Indane gas",                          "utilities"),
        ("HP gas cylinder",                     "utilities"),
        ("Piped gas bill",                      "utilities"),
        ("Gas bill",                            "utilities"),
        # Rent / housing
        ("House rent monthly",                  "utilities"),
        ("Room rent",                           "utilities"),
        ("Apartment rent",                      "utilities"),
        ("Monthly rent transfer",               "utilities"),
        ("Rental payment",                      "utilities"),
        ("PG rent",                             "utilities"),
        ("Hostel rent",                         "utilities"),
        # Society / misc
        ("Society maintenance charges",         "utilities"),
        ("Apartment maintenance",               "utilities"),
        ("Building maintenance",                "utilities"),
        ("DTH Tata Play recharge",              "utilities"),
        ("Dish TV recharge",                    "utilities"),
        ("Cable TV bill",                       "utilities"),
        ("OTT bundle recharge",                 "utilities"),
        ("Newspaper subscription",              "utilities"),
        ("Municipal tax",                       "utilities"),
        ("Property tax",                        "utilities"),

        # ═══════════════════════════════════════════════
        # HEALTH  (~60 examples)
        # ═══════════════════════════════════════════════
        # Single-word
        ("medicine",                            "health"),
        ("medicines",                           "health"),
        ("tablet",                              "health"),
        ("tablets",                             "health"),
        ("doctor",                              "health"),
        ("hospital",                            "health"),
        ("pharmacy",                            "health"),
        ("gym",                                 "health"),
        ("yoga",                                "health"),
        ("dental",                              "health"),
        ("vaccine",                             "health"),
        ("physiotherapy",                       "health"),
        # Pharmacy / medicines
        ("Apollo pharmacy",                     "health"),
        ("MedPlus medicines",                   "health"),
        ("Netmeds order",                       "health"),
        ("1mg pharmacy",                        "health"),
        ("PharmEasy order",                     "health"),
        ("Prescription medicines",              "health"),
        ("Eye drops pharmacy",                  "health"),
        ("Vitamins supplements",                "health"),
        ("Protein supplements",                 "health"),
        ("Medical store",                       "health"),
        # Doctor / hospital
        ("Doctor consultation",                 "health"),
        ("Clinic consultation fee",             "health"),
        ("Hospital OPD fee",                    "health"),
        ("Hospital emergency",                  "health"),
        ("Specialist doctor fees",              "health"),
        ("Paediatrician visit",                 "health"),
        ("Dermatologist fees",                  "health"),
        # Diagnostics
        ("Blood test lab",                      "health"),
        ("Thyrocare test",                      "health"),
        ("Lal PathLabs blood test",             "health"),
        ("MRI scan",                            "health"),
        ("X-ray fee",                           "health"),
        ("Pathology lab",                       "health"),
        # Gym / fitness
        ("Gym membership",                      "health"),
        ("Monthly gym fees",                    "health"),
        ("Cult.fit membership",                 "health"),
        ("Fitness class",                       "health"),
        ("Yoga class monthly",                  "health"),
        ("Zumba class",                         "health"),
        ("Personal trainer",                    "health"),
        ("Pilates class",                       "health"),
        # Dental / vision
        ("Dental checkup",                      "health"),
        ("Tooth extraction",                    "health"),
        ("Eye checkup",                         "health"),
        ("Spectacles frames",                   "health"),
        ("Contact lenses",                      "health"),
        # Insurance / therapy
        ("Health insurance premium",            "health"),
        ("Physiotherapy session",               "health"),
        ("Mental health therapy",               "health"),
        ("Psychological counselling",           "health"),

        # ═══════════════════════════════════════════════
        # SHOPPING  (~60 examples)
        # ═══════════════════════════════════════════════
        # Single-word
        ("clothes",                             "shopping"),
        ("shoes",                               "shopping"),
        ("shirt",                               "shopping"),
        ("jeans",                               "shopping"),
        ("kurta",                               "shopping"),
        ("laptop",                              "shopping"),
        ("headphones",                          "shopping"),
        ("furniture",                           "shopping"),
        ("gift",                                "shopping"),
        ("saree",                               "shopping"),
        ("phone",                               "shopping"),
        ("watch",                               "shopping"),
        # E-commerce
        ("Amazon order",                        "shopping"),
        ("Flipkart purchase",                   "shopping"),
        ("Myntra clothes",                      "shopping"),
        ("Meesho kurta",                        "shopping"),
        ("Ajio outfit",                         "shopping"),
        ("Nykaa skincare",                      "shopping"),
        ("Puma shoes",                          "shopping"),
        ("Nike sneakers",                       "shopping"),
        ("Adidas sports",                       "shopping"),
        # Electronics
        ("Croma laptop",                        "shopping"),
        ("Reliance Digital",                    "shopping"),
        ("Boat earphones",                      "shopping"),
        ("JBL speaker",                         "shopping"),
        ("Samsung earbuds",                     "shopping"),
        ("Mobile accessories",                  "shopping"),
        # Home / furniture
        ("IKEA furniture",                      "shopping"),
        ("Decathlon sports",                    "shopping"),
        ("Home d\u00e9cor items",                    "shopping"),
        ("Curtains home",                       "shopping"),
        ("Kitchen utensils",                    "shopping"),
        # Apparel
        ("H&M clothes",                         "shopping"),
        ("Zara outfit",                         "shopping"),
        ("Westside shirts",                     "shopping"),
        ("FabIndia kurta",                      "shopping"),
        ("Allen Solly formal",                  "shopping"),
        ("Bata shoes",                          "shopping"),
        ("Mochi footwear",                      "shopping"),
        # Accessories / gifts
        ("Titan watch",                         "shopping"),
        ("Fossil watch",                        "shopping"),
        ("Birthday gift purchase",              "shopping"),
        ("Wedding gift",                        "shopping"),
        ("Festival shopping",                   "shopping"),
        ("Diwali gifts",                        "shopping"),
        # Beauty
        ("Skincare products",                   "shopping"),
        ("Cosmetics purchase",                  "shopping"),
        ("Lakme products",                      "shopping"),
        ("Mamaearth order",                     "shopping"),
        # Books / misc
        ("Books purchase",                      "shopping"),
        ("Stationery office",                   "shopping"),
        ("Online shopping",                     "shopping"),
        ("Shopping mall",                       "shopping"),

        # ═══════════════════════════════════════════════
        # EDUCATION  (~55 examples)
        # ═══════════════════════════════════════════════
        # Single-word / short
        ("tuition",                             "education"),
        ("coaching",                            "education"),
        ("exam fees",                           "education"),
        ("exam fee",                            "education"),
        ("exam",                                "education"),
        ("stationery",                          "education"),
        ("workshop",                            "education"),
        ("certification",                       "education"),
        ("college fees",                        "education"),
        ("school fees",                         "education"),
        ("course fee",                          "education"),
        ("books",                               "education"),
        ("textbooks",                           "education"),
        # Online courses
        ("Udemy course",                        "education"),
        ("Coursera monthly",                    "education"),
        ("LinkedIn Learning",                   "education"),
        ("Codecademy pro",                      "education"),
        ("Khan Academy",                        "education"),
        ("Unacademy subscription",              "education"),
        ("BYJU's fees",                         "education"),
        ("WhiteHat Jr",                         "education"),
        ("Simplilearn course",                  "education"),
        ("Great Learning",                      "education"),
        ("Coding bootcamp",                     "education"),
        ("Online class fee",                    "education"),
        # School / college
        ("College tuition fee",                 "education"),
        ("Semester fees",                       "education"),
        ("School annual fee",                   "education"),
        ("College admission",                   "education"),
        ("Hostel fee college",                  "education"),
        ("Lab fee college",                     "education"),
        # Exams / competitive
        ("IELTS registration",                  "education"),
        ("GATE exam fee",                       "education"),
        ("CAT registration",                    "education"),
        ("UPSC exam form",                      "education"),
        ("NEET exam registration",              "education"),
        ("JEE form fee",                        "education"),
        ("GRE exam fee",                        "education"),
        ("TOEFL exam",                          "education"),
        ("Competitive exam fee",                "education"),
        # Coaching / tutoring
        ("JEE coaching fee",                    "education"),
        ("NEET coaching",                       "education"),
        ("Tuition class monthly",               "education"),
        ("Private tutor",                       "education"),
        ("Language class",                      "education"),
        ("Music class fees",                    "education"),
        ("Dance class monthly",                 "education"),
        ("Abacus class",                        "education"),
        # Books / stationery
        ("School books",                        "education"),
        ("College stationery",                  "education"),
        ("Notebook purchase",                   "education"),
        ("Art supplies",                        "education"),
        ("Study material",                      "education"),

        # ═══════════════════════════════════════════════
        # ENTERTAINMENT  (~55 examples)
        # ═══════════════════════════════════════════════
        # Single-word
        ("netflix",                             "entertainment"),
        ("spotify",                             "entertainment"),
        ("gaming",                              "entertainment"),
        ("movie",                               "entertainment"),
        ("concert",                             "entertainment"),
        ("subscription",                        "entertainment"),
        # OTT platforms
        ("Netflix subscription",                "entertainment"),
        ("Amazon Prime Video",                  "entertainment"),
        ("Disney+ Hotstar",                     "entertainment"),
        ("SonyLIV monthly",                     "entertainment"),
        ("ZEE5 subscription",                   "entertainment"),
        ("JioCinema premium",                   "entertainment"),
        ("Voot select",                         "entertainment"),
        ("Mubi subscription",                   "entertainment"),
        ("Apple TV plus",                       "entertainment"),
        # Music
        ("Spotify premium",                     "entertainment"),
        ("Apple Music",                         "entertainment"),
        ("YouTube Music",                       "entertainment"),
        ("Wynk music",                          "entertainment"),
        # Movies
        ("PVR movie tickets",                   "entertainment"),
        ("INOX cinema",                         "entertainment"),
        ("Cinepolis tickets",                   "entertainment"),
        ("BookMyShow movie",                    "entertainment"),
        ("Film screening",                      "entertainment"),
        # Gaming
        ("Steam game purchase",                 "entertainment"),
        ("PS5 game",                            "entertainment"),
        ("Xbox game pass",                      "entertainment"),
        ("BGMI UC purchase",                    "entertainment"),
        ("Free Fire diamonds",                  "entertainment"),
        ("Mobile game in-app",                  "entertainment"),
        ("Gaming subscription",                 "entertainment"),
        # Live events
        ("BookMyShow concert",                  "entertainment"),
        ("IPL cricket tickets",                 "entertainment"),
        ("Stand-up comedy show",                "entertainment"),
        ("Theatre show",                        "entertainment"),
        ("Music festival",                      "entertainment"),
        # Social / leisure
        ("Bowling alley",                       "entertainment"),
        ("Escape room",                         "entertainment"),
        ("Laser tag",                           "entertainment"),
        ("Amusement park",                      "entertainment"),
        ("Zoo visit",                           "entertainment"),
        ("Museum ticket",                       "entertainment"),
        # Misc
        ("YouTube premium",                     "entertainment"),
        ("Podcast subscription",                "entertainment"),
        ("eBook subscription",                  "entertainment"),
        ("Kindle Unlimited",                    "entertainment"),
        ("Nintendo game",                       "entertainment"),
        ("Party supplies",                      "entertainment"),
        ("Birthday party",                      "entertainment"),

        # ═══════════════════════════════════════════════
        # TRAVEL  (~55 examples)
        # ═══════════════════════════════════════════════
        # Single-word
        ("hotel",                               "travel"),
        ("resort",                              "travel"),
        ("hostel",                              "travel"),
        ("vacation",                            "travel"),
        ("holiday",                             "travel"),
        ("visa",                                "travel"),
        # Accommodation
        ("OYO rooms booking",                   "travel"),
        ("Airbnb stay",                         "travel"),
        ("Hotel booking",                       "travel"),
        ("Treebo hotel",                        "travel"),
        ("Fab Hotels",                          "travel"),
        ("Resort booking Coorg",                "travel"),
        ("Beach resort",                        "travel"),
        ("Hill station stay",                   "travel"),
        ("Homestay booking",                    "travel"),
        ("Guest house",                         "travel"),
        # Trip planning
        ("MakeMyTrip holiday",                  "travel"),
        ("Goibibo package",                     "travel"),
        ("Yatra travel",                        "travel"),
        ("Thomas Cook tour",                    "travel"),
        ("Cox and Kings tour",                  "travel"),
        ("Holiday package",                     "travel"),
        ("Weekend trip",                        "travel"),
        ("Family vacation",                     "travel"),
        # Flights (long-haul / vacation)
        ("International flight",                "travel"),
        ("Emirates ticket",                     "travel"),
        ("Singapore Airlines",                  "travel"),
        ("Flight vacation",                     "travel"),
        ("Return flight",                       "travel"),
        # Train (vacation)
        ("IRCTC tatkal",                        "travel"),
        ("Rajdhani ticket",                     "travel"),
        ("Shatabdi train",                      "travel"),
        ("Train journey",                       "travel"),
        ("Outstation train",                    "travel"),
        # Documents / insurance
        ("Passport fees",                       "travel"),
        ("Visa application",                    "travel"),
        ("Travel insurance",                    "travel"),
        ("Foreign currency",                    "travel"),
        ("Travel forex card",                   "travel"),
        # Misc travel
        ("Backpacker hostel",                   "travel"),
        ("Budget trip",                         "travel"),
        ("Camping fees",                        "travel"),
        ("Trekking package",                    "travel"),
        ("Wildlife safari",                     "travel"),
        ("Sightseeing tour",                    "travel"),
        ("Heritage walk",                       "travel"),
        ("Travel accessories",                  "travel"),

        # ═══════════════════════════════════════════════
        # OTHER  (personal care + misc ~60 examples)
        # ═══════════════════════════════════════════════
        # Personal care — the most important expansion area
    ("haircut",                             "personal_care"),
    ("hair cut",                            "personal_care"),
    ("salon",                               "personal_care"),
    ("barber",                              "personal_care"),
    ("parlour",                             "personal_care"),
    ("parlor",                              "personal_care"),
    ("spa",                                 "personal_care"),
    ("facial",                              "personal_care"),
    ("waxing",                              "personal_care"),
    ("pedicure",                            "personal_care"),
    ("manicure",                            "personal_care"),
    ("threading",                           "personal_care"),
    ("grooming",                            "personal_care"),
    ("beard trim",                          "personal_care"),
    ("hair colour",                         "personal_care"),
    ("hair treatment",                      "personal_care"),
    ("blow dry",                            "personal_care"),
    ("hair spa",                            "personal_care"),
    # Named salons
    ("Jawed Habib haircut",                 "personal_care"),
    ("Naturals salon",                      "personal_care"),
    ("Green Trends salon",                  "personal_care"),
    ("Enrich salon",                        "personal_care"),
    ("Lakme salon visit",                   "personal_care"),
    ("Toni and Guy",                        "personal_care"),
    ("Barber shop visit",                   "personal_care"),
    ("Unisex salon",                        "personal_care"),
    ("Beauty parlour",                      "personal_care"),
    ("Nail salon",                          "personal_care"),
        # Financial misc
        ("ATM withdrawal",                      "other"),
        ("Bank charges",                        "other"),
        ("Loan EMI",                            "other"),
        ("Credit card bill",                    "other"),
        ("Personal loan",                       "other"),
        ("Insurance premium",                   "other"),
        ("LIC premium",                         "other"),
        # Home misc
        ("Laundry",                             "other"),
        ("Dry cleaning",                        "other"),
        ("Home repair",                         "other"),
        ("Plumber fee",                         "other"),
        ("Electrician fee",                     "other"),
        ("Carpenter charges",                   "other"),
        ("Pest control",                        "other"),
        # Donations / gifts
        ("Charity donation",                    "other"),
        ("Temple donation",                     "other"),
        ("Donation NGO",                        "other"),
        ("Festival donation",                   "other"),
        # Pets
        ("Pet food",                            "other"),
        ("Veterinary fee",                      "other"),
        ("Pet grooming",                        "other"),
        ("Dog food",                            "other"),
        # Misc
        ("Courier delivery",                    "other"),
        ("Post office",                         "other"),
        ("Challan fine",                        "other"),
        ("Government fee",                      "other"),
        ("Miscellaneous",                       "other"),
        ("Passport photo",                      "other"),

        # ═══════════════════════════════════════════════
        # INCOME  (salary ~15, freelance ~12, business ~8,
        #          investment ~10, gift ~8, other_income ~6)
        # ═══════════════════════════════════════════════
        # salary
        ("salary",                              "salary"),
        ("Salary credited",                     "salary"),
        ("Monthly salary",                      "salary"),
        ("Salary transfer",                     "salary"),
        ("Payroll credit",                      "salary"),
        ("Salary inward",                       "salary"),
        ("Stipend received",                    "salary"),
        ("Salary payment",                      "salary"),
        ("Net salary",                          "salary"),
        ("Salary NEFT",                         "salary"),
        ("Payday credit",                       "salary"),
        ("Salary deposit",                      "salary"),
        ("Monthly income",                      "salary"),
        ("Wages received",                      "salary"),
        ("CTC credit",                          "salary"),
        # freelance
        ("Freelance payment",                   "freelance"),
        ("Client payment received",             "freelance"),
        ("Project payment",                     "freelance"),
        ("Upwork earnings",                     "freelance"),
        ("Fiverr payment",                      "freelance"),
        ("Freelance invoice",                   "freelance"),
        ("Consulting fee received",             "freelance"),
        ("Contract payment",                    "freelance"),
        ("Gig income",                          "freelance"),
        ("Side project payment",                "freelance"),
        ("Toptal payment",                      "freelance"),
        ("Internship stipend",                  "freelance"),
        # business
        ("Business income",                     "business"),
        ("Business revenue",                    "business"),
        ("Shop income",                         "business"),
        ("Sales revenue",                       "business"),
        ("Commission received",                 "business"),
        ("Rental income",                       "business"),
        ("Tenant rent received",                "business"),
        ("Business profit",                     "business"),
        # investment
        ("Investment return",                   "investment"),
        ("Dividend received",                   "investment"),
        ("Mutual fund redemption",              "investment"),
        ("Stock profit",                        "investment"),
        ("FD interest",                         "investment"),
        ("PPF interest",                        "investment"),
        ("NPS return",                          "investment"),
        ("Bond interest",                       "investment"),
        ("Capital gains",                       "investment"),
        ("Crypto profit",                       "investment"),
        # gift
        ("Gift received",                       "gift"),
        ("Cash gift",                           "gift"),
        ("Birthday money",                      "gift"),
        ("Diwali bonus gift",                   "gift"),
        ("Wedding gift received",               "gift"),
        ("Family gift",                         "gift"),
        ("Festival gift money",                 "gift"),
        ("Bonus from employer",                 "gift"),
        # other_income
        ("Tax refund",                          "other_income"),
        ("Insurance claim",                     "other_income"),
        ("Cashback received",                   "other_income"),
        ("Referral bonus",                      "other_income"),
        ("Lottery prize",                       "other_income"),
        ("Scholarship",                         "other_income"),
    ]

    X = [text for text, label in data]
    y = [label for text, label in data]
    return X, y


# ─────────────────────────────────────────────
# Feature Builder
# ─────────────────────────────────────────────
def build_vectorizer():
    word_vec = TfidfVectorizer(
        preprocessor=clean_text,
        analyzer="word",
        ngram_range=(1, 2),
        max_features=12000,
        sublinear_tf=True,
        min_df=1,
    )

    char_vec = TfidfVectorizer(
        preprocessor=clean_text,
        analyzer="char_wb",
        ngram_range=(3, 5),
        max_features=8000,
        min_df=1,
    )

    return FeatureUnion([
        ("word", word_vec),
        ("char", char_vec),
    ])


# ─────────────────────────────────────────────
# Model Builder
# ─────────────────────────────────────────────
def build_pipeline():
    features = build_vectorizer()

    nb = MultinomialNB(alpha=0.25)

    lr = LogisticRegression(
        max_iter=3000,
        C=4.5,
        solver="lbfgs",
        class_weight="balanced",
        random_state=42
    )

    ensemble = VotingClassifier(
        estimators=[
            ("nb", nb),
            ("lr", lr),
        ],
        voting="soft",
        weights=[1, 3]
    )

    pipe = Pipeline([
        ("features", features),
        ("ensemble", ensemble)
    ])

    return pipe


# ─────────────────────────────────────────────
# Smoke Tests
# ─────────────────────────────────────────────
def run_smoke_tests(model):
    tests = [
        ("haircut", "personal_care"),
        ("salon", "personal_care"),
        ("barber", "personal_care"),
        ("coffee", "food"),
        ("chai", "food"),
        ("groceries", "food"),
        ("petrol", "transport"),
        ("cab", "transport"),
        ("rent", "utilities"),
        ("recharge", "utilities"),
        ("medicine", "health"),
        ("gym", "health"),
        ("exam fees", "education"),
        ("netflix", "entertainment"),
        ("hotel booking", "travel"),
        ("salary credited", "salary"),
        ("freelance payment", "freelance"),
        ("business revenue", "business"),
        ("dividend received", "investment"),
        ("gift received", "gift"),
        ("tax refund", "other_income"),
    ]

    logger.info("\nSmoke Tests:")
    fails = 0

    for text, expected in tests:
        pred = model.predict([text])[0]
        conf = float(model.predict_proba([text]).max())

        ok = pred == expected
        icon = "✓" if ok else "✗"

        if not ok:
            fails += 1

        logger.info(
            f" {icon} '{text}' → {pred} ({conf:.0%}) [want: {expected}]"
        )

    if fails == 0:
        logger.info("All smoke tests passed.")
    else:
        logger.warning(f"{fails} smoke tests failed.")


# ─────────────────────────────────────────────
# Training
# ─────────────────────────────────────────────
def train():
    logger.info("Loading training data...")
    X, y = get_training_data()

    logger.info(f"Total samples: {len(X)}")

    counts = Counter(y)
    for cls, count in sorted(counts.items()):
        logger.info(f"{cls:<18} {count}")

    model = build_pipeline()

    logger.info("\nRunning 5-Fold Cross Validation...")
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

    scores = cross_val_score(
        model,
        X,
        y,
        cv=cv,
        scoring="accuracy"
    )

    logger.info(
        f"CV Accuracy: {scores.mean():.3f} ± {scores.std():.3f}"
    )

    logger.info("\nTraining final model...")
    model.fit(X, y)

    preds = model.predict(X)
    logger.info("\n" + classification_report(y, preds))

    run_smoke_tests(model)

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, MODEL_PATH)

    meta = {
        "samples": len(X),
        "classes": sorted(list(set(y))),
        "cv_accuracy_mean": float(scores.mean()),
        "cv_accuracy_std": float(scores.std()),
    }

    with open(META_PATH, "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)

    logger.info(f"\nSaved model → {MODEL_PATH}")
    logger.info(f"Saved meta  → {META_PATH}")


# ─────────────────────────────────────────────
if __name__ == "__main__":
    train()
