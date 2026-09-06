export interface StateWithDistricts {
  state: string;
  districts: string[];
}

export const INDIAN_STATES_AND_DISTRICTS: StateWithDistricts[] = [
  // 28 States
  {
    state: "Andhra Pradesh",
    districts: [
      "Alluri Sitharama Raju", "Anakapalli", "Ananthapuramu", "Annamayya", "Bapatla", 
      "Chittoor", "East Godavari", "Eluru", "Guntur", "Kakinada", "Konaseema", 
      "Krishna", "Kurnool", "Nandyal", "NTR", "Palnadu", "Parvathipuram Manyam", 
      "Prakasam", "Sri Potti Sriramulu Nellore", "Sri Sathya Sai", "Srikakulam", 
      "Tirupati", "Visakhapatnam", "Vizianagaram", "West Godavari", "YSR Kadapa"
    ]
  },
  {
    state: "Arunachal Pradesh",
    districts: [
      "Anjaw", "Changlang", "Kamle", "Kra Daadi", "Kurung Kumey", "Lepa Rada", 
      "Lohit", "Longding", "Lower Dibang Valley", "Lower Siang", "Lower Subansiri", 
      "Namsai", "Pakke Kessang", "Papum Pare", "Shi Yomi", "Siang", "Tawang", 
      "Tirap", "Upper Dibang Valley", "Upper Siang", "Upper Subansiri", "West Kameng", 
      "West Siang", "Itanagar"
    ]
  },
  {
    state: "Assam",
    districts: [
      "Bajali", "Baksa", "Barpeta", "Biswanath", "Bongaigaon", "Cachar", "Charaideo", 
      "Chirang", "Darrang", "Dhemaji", "Dhubri", "Dibrugarh", "Dima Hasao", "Goalpara", 
      "Golaghat", "Hailakandi", "Hojai", "Jorhat", "Kamrup", "Kamrup Metropolitan", 
      "Karbi Anglong", "Karimganj", "Kokrajhar", "Lakhimpur", "Majuli", "Morigaon", 
      "Nagaon", "Nalbari", "Sivasagar", "Sonitpur", "South Salmara-Mankachar", "Tinsukia", 
      "Udalguri", "West Karbi Anglong"
    ]
  },
  {
    state: "Bihar",
    districts: [
      "Araria", "Arwal", "Aurangabad", "Banka", "Begusarai", "Bhagalpur", "Bhojpur", 
      "Buxar", "Darbhanga", "East Champaran", "Gaya", "Gopalganj", "Jamui", "Jehanabad", 
      "Kaimur", "Katihar", "Khagaria", "Kishanganj", "Lakhisarai", "Madhepura", 
      "Madhubani", "Munger", "Muzaffarpur", "Nalanda", "Nawada", "Patna", "Purnia", 
      "Rohtas", "Saharsa", "Samastipur", "Saran", "Sheikhpura", "Sheohar", "Sitamarhi", 
      "Siwan", "Supaul", "Vaishali", "West Champaran"
    ]
  },
  {
    state: "Chhattisgarh",
    districts: [
      "Balod", "Baloda Bazar", "Balrampur", "Bastar", "Bemetara", "Bijapur", "Bilaspur", 
      "Dantewada", "Dhamtari", "Durg", "Gariaband", "Gaurela-Pendra-Marwahi", 
      "Janjgir-Champa", "Jashpur", "Kabirdham", "Kanker", "Kondagaon", "Korba", "Koriya", 
      "Mahasamund", "Manendragarh-Chirmiri-Bharatpur", "Mohla-Manpur-Ambagarh Chowki", 
      "Mungeli", "Narayanpur", "Raigarh", "Raipur", "Rajnandgaon", "Sakti", 
      "Sarangarh-Bilaigarh", "Sukma", "Surajpur", "Surguja"
    ]
  },
  {
    state: "Goa",
    districts: ["North Goa", "South Goa"]
  },
  {
    state: "Gujarat",
    districts: [
      "Ahmedabad", "Amreli", "Anand", "Aravalli", "Banaskantha", "Bharuch", "Bhavnagar", 
      "Botad", "Chhota Udepur", "Dahod", "Dang", "Devbhumi Dwarka", "Gandhinagar", 
      "Gir Somnath", "Jamnagar", "Junagadh", "Kheda", "Kutch", "Mahisagar", "Mehsana", 
      "Morbi", "Narmada", "Navsari", "Panchmahal", "Patan", "Porbandar", "Rajkot", 
      "Sabarkantha", "Surat", "Surendranagar", "Tapi", "Vadodara", "Valsad"
    ]
  },
  {
    state: "Haryana",
    districts: [
      "Ambala", "Bhiwani", "Charkhi Dadri", "Faridabad", "Fatehabad", "Gurugram", 
      "Hisar", "Jhajjar", "Jind", "Kaithal", "Karnal", "Kurukshetra", "Mahendragarh", 
      "Nuh", "Palwal", "Panchkula", "Panipat", "Rewari", "Rohtak", "Sirsa", "Sonipat", 
      "Yamunanagar"
    ]
  },
  {
    state: "Himachal Pradesh",
    districts: [
      "Bilaspur", "Chamba", "Hamirpur", "Kangra", "Kinnaur", "Kullu", "Lahaul and Spiti", 
      "Mandi", "Shimla", "Sirmaur", "Solan", "Una"
    ]
  },
  {
    state: "Jharkhand",
    districts: [
      "Bokaro", "Chatra", "Deoghar", "Dhanbad", "Dumka", "East Singhbhum", "Garhwa", 
      "Giridih", "Godda", "Gumla", "Hazaribagh", "Jamtara", "Khunti", "Koderma", 
      "Latehar", "Lohardaga", "Pakur", "Palamu", "Ramgarh", "Ranchi", "Sahibganj", 
      "Seraikela Kharsawan", "Simdega", "West Singhbhum"
    ]
  },
  {
    state: "Karnataka",
    districts: [
      "Bagalkote", "Ballari", "Belagavi", "Bengaluru Rural", "Bengaluru Urban", "Bidar", 
      "Chamarajanagar", "Chikkaballapura", "Chikkamagaluru", "Chitradurga", "Dakshina Kannada", 
      "Davanagere", "Dharwad", "Gadag", "Hassan", "Haveri", "Kalaburagi", "Kodagu", 
      "Kolar", "Koppal", "Mandya", "Mysuru", "Raichur", "Ramanagara", "Shivamogga", 
      "Tumakuru", "Udupi", "Uttara Kannada", "Vijayanagara", "Vijayapura", "Yadgir"
    ]
  },
  {
    state: "Kerala",
    districts: [
      "Alappuzha", "Ernakulam", "Idukki", "Kannur", "Kasaragod", "Kollam", "Kottayam", 
      "Kozhikode", "Malappuram", "Palakkad", "Pathanamthitta", "Thiruvananthapuram", 
      "Thrissur", "Wayanad"
    ]
  },
  {
    state: "Madhya Pradesh",
    districts: [
      "Agar Malwa", "Alirajpur", "Anuppur", "Ashoknagar", "Balaghat", "Barwani", "Betul", 
      "Bhind", "Bhopal", "Burhanpur", "Chhatarpur", "Chhindwara", "Damoh", "Datia", 
      "Dewas", "Dhar", "Dindori", "Guna", "Gwalior", "Harda", "Hoshangabad", "Indore", 
      "Jabalpur", "Jhabua", "Katni", "Khandwa", "Khargone", "Mandla", "Mandsaur", 
      "Morena", "Narsinghpur", "Neemuch", "Niwari", "Panna", "Raisen", "Rajgarh", 
      "Ratlam", "Rewa", "Sagar", "Satna", "Sehore", "Seoni", "Shahdol", "Shajapur", 
      "Sheopur", "Shivpuri", "Sidhi", "Singrauli", "Tikamgarh", "Ujjain", "Umaria", "Vidisha"
    ]
  },
  {
    state: "Maharashtra",
    districts: [
      "Ahmednagar", "Akola", "Amravati", "Aurangabad (Chhatrapati Sambhajinagar)", "Beed", 
      "Bhandara", "Buldhana", "Chandrapur", "Dhule", "Gadchiroli", "Gondia", "Hingoli", 
      "Jalgaon", "Jalna", "Kolhapur", "Latur", "Mumbai City", "Mumbai Suburban", "Nagpur", 
      "Nanded", "Nandurbar", "Nashik", "Osmanabad (Dharashiv)", "Palghar", "Parbhani", 
      "Pune", "Raigad", "Ratnagiri", "Sangli", "Satara", "Sindhudurg", "Solapur", 
      "Thane", "Wardha", "Washim", "Yavatmal"
    ]
  },
  {
    state: "Manipur",
    districts: [
      "Bishnupur", "Chandel", "Churachandpur", "Imphal East", "Imphal West", "Jiribam", 
      "Kakching", "Kamjong", "Kangpokpi", "Noney", "Pherzawl", "Senapati", "Tamenglong", 
      "Tengnoupal", "Thoubal", "Ukhrul"
    ]
  },
  {
    state: "Meghalaya",
    districts: [
      "Eastern West Khasi Hills", "East Garo Hills", "East Jaintia Hills", "East Khasi Hills", 
      "North Garo Hills", "Ri Bhoi", "South Garo Hills", "South West Garo Hills", 
      "South West Khasi Hills", "West Garo Hills", "West Jaintia Hills", "West Khasi Hills"
    ]
  },
  {
    state: "Mizoram",
    districts: [
      "Aizawl", "Champhai", "Hnahthial", "Khawzawl", "Kolasib", "Lawngtlai", 
      "Lunglei", "Mamit", "Saitual", "Serchhip", "Siaha"
    ]
  },
  {
    state: "Nagaland",
    districts: [
      "Chumoukedima", "Dimapur", "Kiphire", "Kohima", "Longleng", "Mokokchung", 
      "Mon", "Niuland", "Noklak", "Peren", "Phek", "Shamator", "Tseminyu", 
      "Tuensang", "Wokha", "Zunheboto"
    ]
  },
  {
    state: "Odisha",
    districts: [
      "Angul", "Balangir", "Balasore", "Bargarh", "Bhadrak", "Boudh", "Cuttack", 
      "Deogarh", "Dhenkanal", "Gajapati", "Ganjam", "Jagatsinghpur", "Jajpur", 
      "Jharsuguda", "Kalahandi", "Kandhamal", "Kendrapara", "Kendujhar", "Khordha (Bhubaneswar)", 
      "Koraput", "Malkangiri", "Mayurbhanj", "Nabarangpur", "Nayagarh", "Nuapada", 
      "Puri", "Rayagada", "Sambalpur", "Subarnapur", "Sundargarh"
    ]
  },
  {
    state: "Punjab",
    districts: [
      "Amritsar", "Barnala", "Bathinda", "Faridkot", "Fatehgarh Sahib", "Fazilka", 
      "Ferozepur", "Gurdaspur", "Hoshiarpur", "Jalandhar", "Kapurthala", "Ludhiana", 
      "Malerkotla", "Mansa", "Moga", "Muktsar", "Pathankot", "Patiala", "Rupnagar", 
      "Sahibzada Ajit Singh Nagar (Mohali)", "Sangrur", "Shahid Bhagat Singh Nagar", 
      "Sri Muktsar Sahib", "Tarn Taran"
    ]
  },
  {
    state: "Rajasthan",
    districts: [
      "Ajmer", "Alwar", "Anupgarh", "Balotra", "Banswara", "Baran", "Barmer", 
      "Beawar", "Bharatpur", "Bhilwara", "Bikaner", "Bundi", "Chittorgarh", 
      "Churu", "Dausa", "Deeg", "Didwana-Kuchaman", "Dholpur", "Dudu", "Dungarpur", 
      "Ganganagar", "Gangapur City", "Hanumangarh", "Jaipur", "Jaipur Rural", "Jaisalmer", 
      "Jalore", "Jhalawar", "Jhunjhunu", "Jodhpur", "Jodhpur Rural", "Karauli", 
      "Kekri", "Khairthal-Tijara", "Kota", "Kotputli-Behror", "Nagaur", "Neem Ka Thana", 
      "Pali", "Phalodi", "Pratapgarh", "Rajsamand", "Salumbar", "Sanchore", "Sawai Madhopur", 
      "Shahpura", "Sikar", "Sirohi", "Tonk", "Udaipur"
    ]
  },
  {
    state: "Sikkim",
    districts: ["Gangtok", "Gyalshing", "Mangan", "Namchi", "Pakyong", "Soreng"]
  },
  {
    state: "Tamil Nadu",
    districts: [
      "Ariyalur", "Chengalpattu", "Chennai", "Coimbatore", "Cuddalore", "Dharmapuri", 
      "Dindigul", "Erode", "Kallakurichi", "Kanchipuram", "Kanyakumari", "Karur", 
      "Krishnagiri", "Madurai", "Mayiladuthurai", "Nagapattinam", "Namakkal", 
      "Nilgiris", "Perambalur", "Pudukkottai", "Ramanathapuram", "Ranipet", "Salem", 
      "Sivaganga", "Tenkasi", "Thanjavur", "Theni", "Thoothukudi", "Tiruchirappalli", 
      "Tirunelveli", "Tirupathur", "Tiruppur", "Tiruvallur", "Tiruvannamalai", "Tiruvarur", 
      "Vellore", "Viluppuram", "Virudhunagar"
    ]
  },
  {
    state: "Telangana",
    districts: [
      "Adilabad", "Bhadradri Kothagudem", "Hanumakonda", "Hyderabad", "Jagtial", 
      "Jangaon", "Jayashankar Bhupalpally", "Jogulamba Gadwal", "Kamareddy", 
      "Karimnagar", "Khammam", "Kumuram Bheem Asifabad", "Mahabubabad", 
      "Mahabubnagar", "Mancherial", "Medak", "Medchal-Malkajgiri", "Mulugu", 
      "Nagarkurnool", "Nalgonda", "Narayanpet", "Nirmal", "Nizamabad", "Peddapalli", 
      "Rajanna Sircilla", "Rangareddy", "Sangareddy", "Siddipet", "Suryapet", 
      "Vikarabad", "Wanaparthy", "Warangal", "Yadadri Bhuvanagiri"
    ]
  },
  {
    state: "Tripura",
    districts: [
      "Dhalai", "Gomati", "Khowai", "North Tripura", "Sepahijala", "South Tripura", 
      "Unakoti", "West Tripura"
    ]
  },
  {
    state: "Uttar Pradesh",
    districts: [
      "Agra", "Aligarh", "Ambedkar Nagar", "Amethi", "Amroha", "Auraiya", "Ayodhya", 
      "Azamgarh", "Baghpat", "Bahraich", "Ballia", "Balrampur", "Banda", "Barabanki", 
      "Bareilly", "Basti", "Bhadohi", "Bijnor", "Budaun", "Bulandshahr", "Chandauli", 
      "Chitrakoot", "Deoria", "Etah", "Etawah", "Farrukhabad", "Fatehpur", "Firozabad", 
      "Gautam Buddha Nagar (Noida)", "Ghaziabad", "Ghazipur", "Gonda", "Gorakhpur", 
      "Hamirpur", "Hapur", "Hardoi", "Hathras", "Jalaun", "Jaunpur", "Jhansi", 
      "Kannauj", "Kanpur Dehat", "Kanpur Nagar", "Kasganj", "Kaushambi", "Kheri", 
      "Kushinagar", "Lalitpur", "Lucknow", "Maharajganj", "Mahoba", "Mainpuri", 
      "Mathura", "Mau", "Meerut", "Mirzapur", "Moradabad", "Muzaffarnagar", "Pilibhit", 
      "Pratapgarh", "Prayagraj", "Raebareli", "Rampur", "Saharanpur", "Sambhal", 
      "Sant Kabir Nagar", "Shahjahanpur", "Shamli", "Shravasti", "Siddharthnagar", 
      "Sitapur", "Sonbhadra", "Sultanpur", "Unnao", "Varanasi"
    ]
  },
  {
    state: "Uttarakhand",
    districts: [
      "Almora", "Bageshwar", "Chamoli", "Champawat", "Dehradun", "Haridwar", 
      "Nainital", "Pauri Garhwal", "Pithoragarh", "Rudraprayag", "Tehri Garhwal", 
      "Udham Singh Nagar", "Uttarkashi"
    ]
  },
  {
    state: "West Bengal",
    districts: [
      "Alipurduar", "Bankura", "Birbhum", "Cooch Behar", "Dakshin Dinajpur", 
      "Darjeeling", "Hooghly", "Howrah", "Jalpaiguri", "Jhargram", "Kalimpong", 
      "Kolkata", "Malda", "Murshidabad", "Nadia", "North 24 Parganas", "Paschim Bardhaman", 
      "Paschim Medinipur", "Purba Bardhaman", "Purba Medinipur", "Purulia", 
      "South 24 Parganas", "Uttar Dinajpur"
    ]
  },

  // 8 Union Territories
  {
    state: "Delhi (NCT)",
    districts: [
      "Central Delhi", "East Delhi", "New Delhi", "North Delhi", "North East Delhi", 
      "North West Delhi", "Shahdara", "South Delhi", "South East Delhi", "South West Delhi", 
      "West Delhi"
    ]
  },
  {
    state: "Jammu and Kashmir",
    districts: [
      "Anantnag", "Bandipora", "Baramulla", "Budgam", "Doda", "Ganderbal", "Jammu", 
      "Kathua", "Kishtwar", "Kulgam", "Kupwara", "Poonch", "Pulwama", "Rajouri", 
      "Ramban", "Reasi", "Samba", "Shopian", "Srinagar", "Udhampur"
    ]
  },
  {
    state: "Ladakh",
    districts: ["Kargil", "Leh"]
  },
  {
    state: "Chandigarh",
    districts: ["Chandigarh"]
  },
  {
    state: "Puducherry",
    districts: ["Karaikal", "Mahe", "Puducherry", "Yanam"]
  },
  {
    state: "Andaman and Nicobar Islands",
    districts: ["Nicobar", "North and Middle Andaman", "South Andaman"]
  },
  {
    state: "Dadra and Nagar Haveli and Daman and Diu",
    districts: ["Dadra and Nagar Haveli", "Daman", "Diu"]
  },
  {
    state: "Lakshadweep",
    districts: ["Lakshadweep"]
  }
];

export const POPULAR_CITIES = [
  "All India",
  "Delhi",
  "Mumbai",
  "Bengaluru",
  "Chennai",
  "Hyderabad",
  "Pune",
  "Kolkata",
  "Ahmedabad",
  "Jaipur",
  "Coimbatore",
  "Karur",
  "Madurai",
  "Trichy",
  "Salem",
  "Chandigarh",
  "Lucknow",
  "Kochi",
  "Indore",
  "Surat"
];

export interface LocationSearchItem {
  id: string;
  name: string;
  state: string;
  type: 'all' | 'city' | 'district' | 'state';
  isPopular?: boolean;
}

// Pre-computed flat list of all searchable Indian locations
export const ALL_INDIAN_LOCATIONS: LocationSearchItem[] = [
  { id: 'all_india', name: 'All India', state: 'Pan India', type: 'all', isPopular: true },
  ...INDIAN_STATES_AND_DISTRICTS.flatMap((item) => {
    const stateItem: LocationSearchItem = {
      id: `state_${item.state.toLowerCase().replace(/\s+/g, '_')}`,
      name: item.state,
      state: item.state,
      type: 'state',
    };
    const districtItems: LocationSearchItem[] = item.districts.map((d) => ({
      id: `district_${item.state.toLowerCase()}_${d.toLowerCase().replace(/\s+/g, '_')}`,
      name: d,
      state: item.state,
      type: 'district',
      isPopular: POPULAR_CITIES.includes(d),
    }));
    return [stateItem, ...districtItems];
  }),
];

/**
 * Searches across all Indian states, districts, and popular cities
 */
export function searchIndianLocations(query: string): LocationSearchItem[] {
  const clean = query.trim().toLowerCase();
  if (!clean) return [];

  return ALL_INDIAN_LOCATIONS.filter((item) => {
    if (item.type === 'all') {
      return 'all india'.includes(clean) || 'pan india'.includes(clean);
    }
    const nameMatch = item.name.toLowerCase().includes(clean);
    const stateMatch = item.state.toLowerCase().includes(clean);
    return nameMatch || stateMatch;
  }).slice(0, 50); // limit to 50 for smooth render
}

