#!/usr/bin/env python3
r"""
Excel to Universities JSON Converter

Converts the Bachelors.xlsx file into a universities.v2.json file
compatible with the Kallisto university import system.

Usage:
    python excel_to_universities.py --input "path/to/Bachelors.xlsx" --output "./data/universities.v2.json"

Requirements:
    pip install openpyxl
"""

import argparse
import json
import re
import uuid
from pathlib import Path
from typing import Any, Optional
from openpyxl import load_workbook


# University name mappings (sheet prefix -> canonical name)
UNIVERSITY_MAPPINGS = {
    "025 International Program": "Tsinghua University",
    "Fudan University": "Fudan University",
    "Peking University": "Peking University",
    "SJTU": "Shanghai Jiao Tong University",
    "Zhejiang University": "Zhejiang University",
    "Zhejiang University(1)": "Zhejiang University",
    "USTC 2026": "University of Science and Technology of China",
    "USTC 2026(2)": "University of Science and Technology of China",
    "XJTU 2026": "Xi'an Jiaotong University",
    "XJTU 2026(1)": "Xi'an Jiaotong University",
    "Sun yat senn": "Sun Yat-sen University",
    "Sun Yat Sen": "Sun Yat-sen University",
    "Nanjing university": "Nanjing University",
    "Wuhan University": "Wuhan University",
    "Wuhan & Nanjing": None,  # Combined sheet, skip
}

# City mappings
UNIVERSITY_CITIES = {
    "Tsinghua University": "Beijing",
    "Fudan University": "Shanghai",
    "Peking University": "Beijing",
    "Shanghai Jiao Tong University": "Shanghai",
    "Zhejiang University": "Hangzhou",
    "University of Science and Technology of China": "Hefei",
    "Xi'an Jiaotong University": "Xi'an",
    "Sun Yat-sen University": "Guangzhou",
    "Nanjing University": "Nanjing",
    "Wuhan University": "Wuhan",
}

# Province mappings
UNIVERSITY_PROVINCES = {
    "Tsinghua University": "Beijing",
    "Fudan University": "Shanghai",
    "Peking University": "Beijing",
    "Shanghai Jiao Tong University": "Shanghai",
    "Zhejiang University": "Zhejiang",
    "University of Science and Technology of China": "Anhui",
    "Xi'an Jiaotong University": "Shaanxi",
    "Sun Yat-sen University": "Guangdong",
    "Nanjing University": "Jiangsu",
    "Wuhan University": "Hubei",
}

# Approximate QS World Rankings 2026
UNIVERSITY_RANKINGS = {
    "Tsinghua University": 25,
    "Peking University": 17,
    "Fudan University": 50,
    "Shanghai Jiao Tong University": 45,
    "Zhejiang University": 47,
    "University of Science and Technology of China": 137,
    "Xi'an Jiaotong University": 344,
    "Sun Yat-sen University": 261,
    "Nanjing University": 133,
    "Wuhan University": 199,
}


def parse_sheet_name(sheet_name: str) -> tuple[Optional[str], Optional[str]]:
    """Parse sheet name to extract university name and data type."""
    # Common patterns: "University Name_DataType" or "Abbreviation_DataType"

    # Handle special cases
    if sheet_name.startswith("????"):
        return None, None

    # Try to split by underscore
    parts = sheet_name.rsplit("_", 1)

    if len(parts) == 2:
        uni_prefix, data_type = parts
        # Normalize data type
        data_type = data_type.lower()
        if "overv" in data_type:
            data_type = "overview"
        elif "requi" in data_type:
            data_type = "requirements"
        elif "major" in data_type:
            data_type = "majors"
        elif "deadline" in data_type:
            data_type = "deadlines"
        elif "fee" in data_type or "schol" in data_type:
            data_type = "fees"
        else:
            data_type = "other"

        # Map to canonical university name
        for prefix, canonical in UNIVERSITY_MAPPINGS.items():
            if uni_prefix.startswith(prefix) or prefix.startswith(uni_prefix):
                return canonical, data_type

        return uni_prefix, data_type

    return None, None


def read_sheet_data(sheet) -> list[dict[str, Any]]:
    """Read all rows from a sheet as list of dicts.

    Handles sheets with multiple header sections (like Wuhan University).
    """
    rows = list(sheet.iter_rows(values_only=True))
    if not rows:
        return []

    # First row is header
    headers = [str(h).strip() if h else f"col_{i}" for i, h in enumerate(rows[0])]

    data = []
    current_headers = headers

    for row in rows[1:]:
        if not any(row):  # Skip empty rows
            continue

        # Check if this row looks like a new header row
        # (e.g., "Teaching Language | Category / Degree Group | School / Program Group | Major | Duration")
        first_cell = str(row[0]).strip().lower() if row[0] else ""
        if first_cell in ["teaching language", "program", "major", "field", "faculty"]:
            # This is a new header row - update headers
            current_headers = [str(h).strip() if h else f"col_{i}" for i, h in enumerate(row)]
            continue

        row_dict = {}
        for i, value in enumerate(row):
            if i < len(current_headers):
                key = current_headers[i]
                row_dict[key] = value
        data.append(row_dict)

    return data


def extract_overview_data(data: list[dict]) -> dict[str, Any]:
    """Extract overview information from overview sheet.

    Captures: website, contact info, address, campuses, application system, etc.
    """
    result = {
        "description": None,
        "universityWebsite": None,
        "schoolWebsite": None,
        "applicationSystem": None,
        "contactEmail": None,
        "contactPhone": None,
        "address": None,
        "postCode": None,
        "campuses": [],
        "accommodation": None,
        "chineseName": None,
        "abbreviation": None,
        "location": None,
        "admissionOffice": None,
        "deadlineNote": None,
        "programGroups": None,
        "programs": [],  # Some overview sheets contain programs too
    }

    for row in data:
        # Handle different column name formats
        # Try multiple possible column names for field/key
        field = ""
        info = ""

        for key in ["Field", "field", "Overview", "overview", "Section", "section"]:
            if key in row and row[key]:
                field = str(row[key]).strip().lower()
                break

        # Also check first column which might be unnamed
        if not field:
            first_key = list(row.keys())[0] if row else None
            if first_key and row.get(first_key):
                field = str(row[first_key]).strip().lower()
                # Get info from second column
                keys = list(row.keys())
                if len(keys) > 1:
                    info = row.get(keys[1], "")

        # Try multiple possible column names for value/info
        if not info:
            for key in ["Information", "information", "Unnamed: 1", "Value", "value"]:
                if key in row and row[key]:
                    info = row[key]
                    break

        # Check if this row contains program data (Wuhan University style)
        teaching_lang = row.get("Teaching Language", row.get("teaching language", ""))
        major = row.get("Major", row.get("major", ""))
        school = row.get("School / Program Group", row.get("School/Department", ""))
        category = row.get("Category / Degree Group", row.get("category", ""))
        duration = row.get("Duration", row.get("duration", ""))

        if major and str(major).strip():
            # This is a program row
            result["programs"].append({
                "name": str(major).strip(),
                "department": str(school).strip() if school else None,
                "faculty": str(category).strip() if category else None,
                "language": str(teaching_lang).strip() if teaching_lang else "Chinese",
                "duration": str(duration).strip() if duration else None,
            })
            continue

        if not info:
            continue

        info_str = str(info).strip()
        if not info_str or info_str.lower() in ["none", "null", "n/a", ""]:
            continue

        # Parse various field types
        # University/School websites
        if "university website" in field:
            result["universityWebsite"] = info_str if info_str.startswith("http") else f"https://{info_str}"
        elif "school website" in field or "main website" in field:
            result["schoolWebsite"] = info_str if info_str.startswith("http") else f"https://{info_str}"
        elif "application system" in field or "online application" in field:
            result["applicationSystem"] = info_str if info_str.startswith("http") else f"https://{info_str}"
        elif "admission" in field and "website" in field:
            if not result["schoolWebsite"]:
                result["schoolWebsite"] = info_str if info_str.startswith("http") else f"https://{info_str}"
        elif ("website" in field or "official" in field) and "http" in info_str:
            if not result["universityWebsite"]:
                result["universityWebsite"] = info_str

        # Contact information
        elif "email" in field:
            result["contactEmail"] = info_str
        elif "telephone" in field or "phone" in field or "contact number" in field:
            result["contactPhone"] = info_str

        # Address information
        elif "main address" in field or "address" in field:
            result["address"] = info_str
        elif "post code" in field or "postcode" in field or "zip" in field:
            result["postCode"] = info_str
        elif "admission office" in field:
            result["admissionOffice"] = info_str

        # Campus and accommodation
        elif "campus" in field:
            result["campuses"] = [c.strip() for c in info_str.split(";")]
        elif "accommodation" in field:
            result["accommodation"] = info_str

        # University identity
        elif "chinese name" in field:
            result["chineseName"] = info_str
        elif "abbreviation" in field:
            result["abbreviation"] = info_str
        elif "location" in field:
            result["location"] = info_str

        # Deadline and program info
        elif "deadline" in field:
            result["deadlineNote"] = info_str
        elif "program group" in field or "program type" in field:
            result["programGroups"] = info_str

    return result


def extract_requirements_data(data: list[dict]) -> dict[str, Any]:
    """Extract admission requirements from requirements sheet.

    Handles multiple formats:
    - XJTU style: No. | Requirement / Document | Details | Applies to
    - Fudan style: Requirement | Applies to | Concrete list / note
    - SJTU style: Route | Requirement | Details

    Returns structured requirements with 'appliesTo' field for program matching.
    """
    result = {
        "ieltsMin": None,
        "toeflMin": None,
        "hskLevel": None,
        "applicationFee": None,
        "requirements": [],
        "eligibility": [],
        "documents": [],
        "generalRequirements": [],  # All requirements for display
    }

    for row in data:
        # Try multiple column name formats
        req = ""
        details = ""
        applies_to = "All programs"

        # Get requirement name
        for key in ["Requirement", "requirement", "Requirement / Document", "Field"]:
            if key in row and row[key]:
                req = str(row[key]).strip()
                break

        # Get details/description
        for key in ["Details", "details", "Concrete list / note", "Information"]:
            if key in row and row[key]:
                details = str(row[key]).strip()
                break

        # Get applies_to field
        for key in ["Applies to", "applies_to", "Route"]:
            if key in row and row[key]:
                applies_to = str(row[key]).strip()
                break

        # Skip if no requirement name or details
        if not req or not details:
            continue

        req_lower = req.lower()
        details_lower = details.lower()

        # Extract IELTS score
        ielts_match = re.search(r'IELTS[:\s]*(\d+\.?\d*)', details, re.IGNORECASE)
        if ielts_match and result["ieltsMin"] is None:
            result["ieltsMin"] = float(ielts_match.group(1))

        # Extract TOEFL score
        toefl_match = re.search(r'TOEFL[:\s]*(?:iBT\s*)?(\d+)', details, re.IGNORECASE)
        if toefl_match and result["toeflMin"] is None:
            result["toeflMin"] = int(toefl_match.group(1))

        # Extract HSK level
        hsk_match = re.search(r'HSK[:\s]*(?:Level\s*)?(\d+)', details, re.IGNORECASE)
        if hsk_match and result["hskLevel"] is None:
            result["hskLevel"] = int(hsk_match.group(1))

        # Extract application fee
        if "fee" in req_lower or "application fee" in req_lower:
            fee_match = re.search(r'RMB\s*([\d,]+)', details)
            if fee_match:
                result["applicationFee"] = float(fee_match.group(1).replace(",", ""))

        # Create requirement entry
        req_entry = {
            "name": req,
            "description": details[:500],
            "appliesTo": applies_to,
        }

        # Add to general requirements for display
        result["generalRequirements"].append(req_entry)

        # Also categorize for structured access
        if any(x in req_lower for x in ["passport", "photo", "diploma", "certificate", "transcript", "document", "form"]):
            result["documents"].append(req_entry)
        elif any(x in req_lower for x in ["age", "health", "citizenship", "nationality", "eligibility", "qualification"]):
            result["eligibility"].append(req_entry)
        else:
            result["requirements"].append(req_entry)

    return result


def generate_program_id(uni_name: str, program_name: str) -> str:
    """Generate a deterministic ID for a program."""
    combined = f"{uni_name.lower()}.{program_name.lower()}".replace(" ", "-")
    return str(uuid.uuid5(uuid.NAMESPACE_DNS, f"kallisto.program.{combined}"))


def extract_majors_data(data: list[dict], uni_name: str) -> list[dict[str, Any]]:
    """Extract programs/majors from majors sheet.

    Returns programs with unique IDs for detail page routing.
    """
    programs = []
    seen = set()
    idx = 0

    for row in data:
        # Try different column names - be more flexible
        major = None
        department = None
        faculty = None
        language = "Chinese"
        duration = None

        # Check all keys for potential major/program name
        for key, value in row.items():
            if not value:
                continue
            key_lower = str(key).lower()
            value_str = str(value).strip()

            if not value_str or value_str.lower() in ["none", "null", "n/a"]:
                continue

            # Major/Program detection
            if any(x in key_lower for x in ["major", "program", "specialization", "course"]):
                if not major:
                    major = value_str
            # Department detection
            elif any(x in key_lower for x in ["department", "school"]) and "school/department" not in key_lower:
                if not department:
                    department = value_str
            elif "school/department" in key_lower or "school / department" in key_lower:
                if not department:
                    department = value_str
            # Faculty/Division detection
            elif any(x in key_lower for x in ["faculty", "division", "college", "category"]):
                if not faculty:
                    faculty = value_str
            # Language detection
            elif "language" in key_lower:
                language = value_str
            # Duration detection
            elif "duration" in key_lower:
                duration = value_str

        # Fallback: use first column if no major found
        if not major and data:
            first_key = list(row.keys())[0] if row else None
            if first_key and row.get(first_key):
                val = str(row[first_key]).strip()
                # Skip if it looks like a header or university name
                if val and not any(x in val.lower() for x in ["university", "campus", "location"]):
                    major = val

        if not major:
            continue

        major_str = str(major).strip()
        if major_str in seen or len(major_str) < 2:
            continue
        seen.add(major_str)

        idx += 1
        programs.append({
            "id": generate_program_id(uni_name, major_str),
            "name": major_str,
            "department": str(department).strip() if department else None,
            "faculty": str(faculty).strip() if faculty else None,
            "language": str(language).strip() if language else "Chinese",
            "duration": str(duration).strip() if duration else None,
            "level": "Bachelor",
        })

    return programs


def extract_fees_data(data: list[dict]) -> dict[str, Any]:
    """Extract tuition and fees from fees sheet.

    Returns detailed fee structure with categorized tuition by program type.
    """
    result = {
        "tuitionFee": None,
        "applicationFee": None,
        "scholarshipAvailable": False,
        "scholarships": [],
        "tuitionByCategory": {},
        "feeItems": [],
    }

    for row in data:
        item = str(row.get("Item", row.get("item", ""))).strip()
        item_lower = item.lower()
        amount = row.get("Amount / information", row.get("Amount", row.get("Information", "")))
        applies_to = str(row.get("Applies to", row.get("applies_to", ""))).strip()

        if not amount:
            continue

        amount_str = str(amount).strip()

        # Extract application fee
        if "application fee" in item_lower:
            fee_match = re.search(r'RMB\s*([\d,]+)', amount_str)
            if fee_match:
                result["applicationFee"] = float(fee_match.group(1).replace(",", ""))
            continue

        # Extract tuition by category
        if "tuition" in item_lower:
            fee_match = re.search(r'RMB\s*([\d,]+)', amount_str)
            fee_value = float(fee_match.group(1).replace(",", "")) if fee_match else None

            # Determine category from item name
            category = "general"
            if "art" in item_lower:
                category = "arts"
            elif "science" in item_lower:
                category = "science"
            elif "medical" in item_lower or "medicine" in item_lower:
                category = "medical"
            elif "english" in item_lower:
                category = "english_taught"
            elif "chinese" in item_lower:
                category = "chinese_taught"

            if fee_value:
                result["tuitionByCategory"][category] = {
                    "amount": fee_value,
                    "description": amount_str,
                    "appliesTo": applies_to,
                }
                # Set default tuition from first entry
                if result["tuitionFee"] is None:
                    result["tuitionFee"] = fee_value
            continue

        # Check for scholarships
        if "scholarship" in item_lower:
            result["scholarshipAvailable"] = True
            result["scholarships"].append({
                "name": item,
                "description": amount_str,
                "appliesTo": applies_to,
            })
            continue

        # Other fee items
        fee_match = re.search(r'RMB\s*([\d,]+)', amount_str)
        result["feeItems"].append({
            "name": item,
            "amount": float(fee_match.group(1).replace(",", "")) if fee_match else None,
            "description": amount_str,
            "appliesTo": applies_to,
        })

    return result


def extract_deadlines_data(data: list[dict]) -> dict[str, Any]:
    """Extract application deadlines from deadlines sheet.

    Returns structured deadline data with program matching info.
    """
    result = {
        "applicationDeadline": None,
        "deadlines": [],
    }

    for row in data:
        program = row.get("Program / route", row.get("Program", ""))
        application_period = row.get("Sure deadline / application period", "")
        final_deadline = row.get("Final deadline", row.get("Deadlines", ""))

        deadline_str = str(final_deadline).strip() if final_deadline else str(application_period).strip()
        period_str = str(application_period).strip() if application_period else None

        if not deadline_str:
            continue

        # Try to extract ISO date
        iso_date = None
        date_match = re.search(r'(\w+)\s+(\d{1,2}),?\s*(\d{4})', deadline_str)
        if date_match:
            month_str, day, year = date_match.groups()
            months = {
                "january": "01", "february": "02", "march": "03", "april": "04",
                "may": "05", "june": "06", "july": "07", "august": "08",
                "september": "09", "october": "10", "november": "11", "december": "12"
            }
            month = months.get(month_str.lower(), "01")
            iso_date = f"{year}-{month}-{day.zfill(2)}"

            if result["applicationDeadline"] is None:
                result["applicationDeadline"] = iso_date

        program_name = str(program).strip() if program else "General"

        result["deadlines"].append({
            "program": program_name,
            "deadline": deadline_str,
            "deadlineIso": iso_date,
            "applicationPeriod": period_str,
            "term": "Fall 2026",  # Default term
        })

    return result


def match_program_category(program: dict) -> str:
    """Determine program category for fee/requirement matching."""
    name_lower = program.get("name", "").lower()
    faculty_lower = (program.get("faculty") or "").lower()
    dept_lower = (program.get("department") or "").lower()
    lang = (program.get("language") or "").lower()

    # Check if English-taught
    if "english" in lang:
        return "english_taught"

    # Check for medical programs
    if any(x in name_lower or x in faculty_lower for x in ["medicine", "medical", "mbbs", "clinical", "pharmacy", "nursing"]):
        return "medical"

    # Check for science programs
    if any(x in name_lower or x in faculty_lower or x in dept_lower for x in
           ["science", "engineering", "physics", "chemistry", "biology", "math", "computer", "technology"]):
        return "science"

    # Check for arts/humanities programs
    if any(x in name_lower or x in faculty_lower for x in
           ["arts", "humanities", "literature", "philosophy", "history", "language", "law", "economics", "business"]):
        return "arts"

    return "general"


def enrich_program_with_data(program: dict, requirements_data: dict, fees_data: dict, deadlines_data: dict) -> dict:
    """Enrich a program with matched requirements, fees, and deadlines."""
    category = match_program_category(program)
    lang = (program.get("language") or "Chinese").lower()
    prog_name = program.get("name", "").lower()

    # Build requirements for this program
    program_requirements = {
        "eligibility": [],
        "documents": [],
        "testScores": {},
    }

    # Filter requirements by applicability
    for req in requirements_data.get("eligibility", []) + requirements_data.get("documents", []):
        applies = req.get("appliesTo", "All programs").lower()
        if "all" in applies:
            if req in requirements_data.get("eligibility", []):
                program_requirements["eligibility"].append(req["description"])
            else:
                program_requirements["documents"].append(req["description"])
        elif "english" in applies and "english" in lang:
            if req in requirements_data.get("eligibility", []):
                program_requirements["eligibility"].append(req["description"])
            else:
                program_requirements["documents"].append(req["description"])
        elif "chinese" in applies and "chinese" in lang:
            if req in requirements_data.get("eligibility", []):
                program_requirements["eligibility"].append(req["description"])
            else:
                program_requirements["documents"].append(req["description"])

    # Add test scores
    if "english" in lang:
        if requirements_data.get("ieltsMin"):
            program_requirements["testScores"]["ielts"] = str(requirements_data["ieltsMin"])
        if requirements_data.get("toeflMin"):
            program_requirements["testScores"]["toefl"] = str(requirements_data["toeflMin"])
    if "chinese" in lang:
        if requirements_data.get("hskLevel"):
            program_requirements["testScores"]["hsk"] = str(requirements_data["hskLevel"])

    program["requirements"] = program_requirements

    # Match fees
    tuition_by_cat = fees_data.get("tuitionByCategory", {})
    matched_fee = None
    if category in tuition_by_cat:
        matched_fee = tuition_by_cat[category]
    elif "english_taught" in tuition_by_cat and "english" in lang:
        matched_fee = tuition_by_cat["english_taught"]
    elif "chinese_taught" in tuition_by_cat and "chinese" in lang:
        matched_fee = tuition_by_cat["chinese_taught"]
    elif "general" in tuition_by_cat:
        matched_fee = tuition_by_cat["general"]
    elif tuition_by_cat:
        # Use first available
        matched_fee = list(tuition_by_cat.values())[0]

    program["fees"] = {
        "tuitionPerYear": matched_fee["amount"] if matched_fee else None,
        "tuitionDescription": matched_fee["description"] if matched_fee else None,
        "applicationFee": fees_data.get("applicationFee"),
    }

    # Match scholarships
    program["scholarships"] = fees_data.get("scholarships", [])

    # Match deadlines - try to find program-specific or fallback to general
    matched_deadline = None
    for dl in deadlines_data.get("deadlines", []):
        dl_prog = dl.get("program", "").lower()
        # Check for exact or partial match
        if prog_name in dl_prog or dl_prog in prog_name:
            matched_deadline = dl
            break
        if category == "english_taught" and "english" in dl_prog:
            matched_deadline = dl
        elif "chinese" in dl_prog and "chinese" in lang:
            matched_deadline = dl
        elif "general" in dl_prog or "all" in dl_prog:
            if matched_deadline is None:
                matched_deadline = dl

    # Use first deadline as fallback
    if matched_deadline is None and deadlines_data.get("deadlines"):
        matched_deadline = deadlines_data["deadlines"][0]

    if matched_deadline:
        program["deadlines"] = [{
            "term": matched_deadline.get("term", "Fall 2026"),
            "deadline": matched_deadline.get("deadline"),
            "deadlineIso": matched_deadline.get("deadlineIso"),
            "applicationPeriod": matched_deadline.get("applicationPeriod"),
        }]
    else:
        program["deadlines"] = []

    return program


def process_university(uni_name: str, sheets_data: dict[str, list[dict]]) -> dict[str, Any]:
    """Process all sheets for a university and create the final record."""

    # Generate a deterministic UUID based on university name
    uni_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"kallisto.{uni_name.lower().replace(' ', '-')}"))

    # Extract data from each sheet type
    requirements_data = {}
    fees_data = {}
    deadlines_data = {}

    if "requirements" in sheets_data:
        requirements_data = extract_requirements_data(sheets_data["requirements"])

    if "fees" in sheets_data:
        fees_data = extract_fees_data(sheets_data["fees"])

    if "deadlines" in sheets_data:
        deadlines_data = extract_deadlines_data(sheets_data["deadlines"])

    # Initialize with defaults
    university = {
        "id": uni_id,
        "name": uni_name,
        "description": None,
        "province": UNIVERSITY_PROVINCES.get(uni_name),
        "city": UNIVERSITY_CITIES.get(uni_name),
        "country": "China",
        "acceptanceRate": None,
        "tuitionFee": fees_data.get("tuitionFee"),
        "applicationDeadline": deadlines_data.get("applicationDeadline"),
        "ieltsMin": requirements_data.get("ieltsMin"),
        "toeflMin": requirements_data.get("toeflMin"),
        "scholarshipAvailable": fees_data.get("scholarshipAvailable", False),
        "cityType": "urban",
        "campusVibe": "academic",
        "applicationSchema": {
            "fields": [
                {"name": "personal_statement", "type": "textarea", "required": True},
                {"name": "high_school_transcript", "type": "file-upload", "required": True},
                {"name": "passport_copy", "type": "file-upload", "required": True},
                {"name": "recommendation_letters", "type": "file-upload", "required": True},
            ]
        },
        "ranking": UNIVERSITY_RANKINGS.get(uni_name),
        "metadata": {
            "programs": [],
            "contact": {},
            "requirements": requirements_data.get("requirements", []),
            "eligibility": requirements_data.get("eligibility", []),
            "documents": requirements_data.get("documents", []),
            "deadlines": deadlines_data.get("deadlines", []),
            "scholarships": fees_data.get("scholarships", []),
            "tuitionByCategory": fees_data.get("tuitionByCategory", {}),
            "hskLevel": requirements_data.get("hskLevel"),
        },
        "applicationFee": requirements_data.get("applicationFee") or fees_data.get("applicationFee"),
    }

    # Process overview - store in universityProfile for frontend display
    overview = {}
    if "overview" in sheets_data:
        overview = extract_overview_data(sheets_data["overview"])

    # Build universityProfile with overview data
    university["universityProfile"] = {
        "website": overview.get("universityWebsite") or overview.get("schoolWebsite"),
        "schoolWebsite": overview.get("schoolWebsite"),
        "applicationSystem": overview.get("applicationSystem"),
        "contactEmail": overview.get("contactEmail"),
        "contactPhone": overview.get("contactPhone"),
        "address": overview.get("address"),
        "postCode": overview.get("postCode"),
        "campuses": overview.get("campuses", []),
        "accommodation": overview.get("accommodation"),
        "chineseName": overview.get("chineseName"),
        "abbreviation": overview.get("abbreviation"),
        "location": overview.get("location"),
        "admissionOffice": overview.get("admissionOffice"),
        "deadlineNote": overview.get("deadlineNote"),
        "programGroups": overview.get("programGroups"),
        # General requirements for display on university page
        "generalRequirements": requirements_data.get("generalRequirements", []),
        "testRequirements": {
            "ieltsMin": requirements_data.get("ieltsMin"),
            "toeflMin": requirements_data.get("toeflMin"),
            "hskLevel": requirements_data.get("hskLevel"),
        },
    }

    # Also store in metadata for backward compatibility
    if overview.get("universityWebsite") or overview.get("schoolWebsite"):
        university["metadata"]["website"] = overview.get("universityWebsite") or overview.get("schoolWebsite")
    if overview.get("contactEmail"):
        university["metadata"]["contact"]["email"] = overview["contactEmail"]
    if overview.get("contactPhone"):
        university["metadata"]["contact"]["phone"] = overview["contactPhone"]
    if overview.get("campuses"):
        university["metadata"]["campuses"] = overview["campuses"]
    if overview.get("deadlineNote"):
        university["metadata"]["deadlineNote"] = overview["deadlineNote"]

    # Add general requirements to metadata as well
    university["metadata"]["generalRequirements"] = requirements_data.get("generalRequirements", [])

    # Some overview sheets contain programs (e.g., Wuhan University)
    if overview.get("programs"):
        # Add IDs to overview-extracted programs
        for i, prog in enumerate(overview["programs"]):
            prog["id"] = generate_program_id(uni_name, prog["name"])
            prog["level"] = "Bachelor"
        university["metadata"]["programs"] = overview["programs"]

    # Process majors (may override overview programs)
    if "majors" in sheets_data:
        programs = extract_majors_data(sheets_data["majors"], uni_name)
        university["metadata"]["programs"] = programs

    # Enrich each program with requirements, fees, deadlines
    enriched_programs = []
    for prog in university["metadata"]["programs"]:
        enriched = enrich_program_with_data(prog, requirements_data, fees_data, deadlines_data)
        enriched_programs.append(enriched)
    university["metadata"]["programs"] = enriched_programs

    # Also add simple program names list
    university["metadata"]["programNames"] = [p["name"] for p in enriched_programs[:20]]

    # Generate description
    program_count = len(university["metadata"].get("programs", []))
    city = university.get("city", "China")
    university["description"] = (
        f"{uni_name} is a prestigious research university located in {city}, China. "
        f"It offers {program_count} undergraduate programs across various disciplines. "
        f"The university accepts international students and provides instruction in Chinese and English."
    )

    return university


def safe_print(msg: str):
    """Print with safe encoding for Windows console."""
    try:
        print(msg)
    except UnicodeEncodeError:
        print(msg.encode("ascii", errors="replace").decode("ascii"))


def main():
    parser = argparse.ArgumentParser(description="Convert Excel to Universities JSON")
    parser.add_argument("--input", "-i", required=True, help="Path to Bachelors.xlsx file")
    parser.add_argument("--output", "-o", default="universities.v2.json", help="Output JSON file path")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    args = parser.parse_args()

    input_path = Path(args.input)
    if not input_path.exists():
        print(f"Error: Input file not found: {input_path}")
        return 1

    print(f"Loading Excel file: {input_path}")
    workbook = load_workbook(input_path, read_only=True, data_only=True)

    # Group sheets by university
    university_sheets: dict[str, dict[str, list[dict]]] = {}

    for sheet_name in workbook.sheetnames:
        uni_name, data_type = parse_sheet_name(sheet_name)

        if not uni_name or not data_type:
            if args.verbose:
                safe_print(f"  Skipping sheet: {sheet_name}")
            continue

        if args.verbose:
            safe_print(f"  Processing: {sheet_name} -> {uni_name} ({data_type})")

        sheet = workbook[sheet_name]
        data = read_sheet_data(sheet)

        if uni_name not in university_sheets:
            university_sheets[uni_name] = {}

        # Merge data if sheet type already exists (e.g., multiple majors sheets)
        if data_type in university_sheets[uni_name]:
            university_sheets[uni_name][data_type].extend(data)
        else:
            university_sheets[uni_name][data_type] = data

    workbook.close()

    # Process each university
    universities = []
    valid_uni_names = set(UNIVERSITY_CITIES.keys())

    for uni_name, sheets_data in university_sheets.items():
        # Skip invalid university names (e.g., sheets with only special characters)
        if not uni_name:
            continue
        # Must contain at least some ASCII letters
        ascii_letters = sum(1 for c in uni_name if c.isascii() and c.isalpha())
        if ascii_letters < 5:
            safe_print(f"  Skipping invalid university: {uni_name}")
            continue
        # Must be in our known list or be a reasonable university name
        if uni_name not in valid_uni_names:
            safe_print(f"  Skipping unknown university: {uni_name}")
            continue

        safe_print(f"Processing: {uni_name}")
        if args.verbose:
            safe_print(f"  Sheets: {list(sheets_data.keys())}")

        university = process_university(uni_name, sheets_data)
        universities.append(university)

        if args.verbose:
            safe_print(f"  Programs: {len(university['metadata'].get('programs', []))}")
            safe_print(f"  Tuition: {university.get('tuitionFee')}")
            safe_print(f"  IELTS: {university.get('ieltsMin')}")

    # Sort by ranking
    universities.sort(key=lambda u: u.get("ranking") or 9999)

    # Write output
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(universities, f, indent=2, ensure_ascii=False)

    print(f"\nSuccess! Generated {len(universities)} universities")
    print(f"Output: {output_path}")

    # Summary
    print("\nSummary:")
    for uni in universities:
        programs = len(uni["metadata"].get("programs", []))
        safe_print(f"  - {uni['name']}: {programs} programs, Ranking #{uni.get('ranking', 'N/A')}")

    return 0


if __name__ == "__main__":
    exit(main())
