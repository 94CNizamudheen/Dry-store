


function findStatePincode(pincode){
    const numPincode=Number(pincode);

    for(const stateData of IndianStatePincodes){
        for(const range of stateData.pincodeRanges){
            if(numPincode>=range.min && numPincode<=range.max){
                return stateData.state;
            }
        }
    }
    return null;
};



const IndianStatePincodes = [
    {
        state: "Andhra Pradesh",
        pincodeRanges: [
            { min: 500000, max: 509999 },   // Hyderabad and surrounding areas
            { min: 520000, max: 529999 }    // Other AP regions
        ]
    },
    {
        state: "Arunachal Pradesh", 
        pincodeRanges: [
            { min: 790001, max: 791999 }
        ]
    },
    {
        state: "Assam",
        pincodeRanges: [
            { min: 780001, max: 788999 }
        ]
    },
    {
        state: "Bihar",
        pincodeRanges: [
            { min: 800001, max: 822999 }
        ]
    },
    {
        state: "Chhattisgarh",
        pincodeRanges: [
            { min: 490001, max: 497999 }
        ]
    },
    {
        state: "Goa",
        pincodeRanges: [
            { min: 403000, max: 403999 }
        ]
    },
    {
        state: "Gujarat",
        pincodeRanges: [
            { min: 360000, max: 364999 },   // Saurashtra region
            { min: 380000, max: 389999 }    // Ahmedabad, Gandhinagar
        ]
    },
    {
        state: "Haryana",
        pincodeRanges: [
            { min: 120000, max: 136099 }
        ]
    },
    {
        state: "Himachal Pradesh",
        pincodeRanges: [
            { min: 170000, max: 179999 }
        ]
    },
    {
        state: "Jharkhand",
        pincodeRanges: [
            { min: 820001, max: 832999 }
        ]
    },
    {
        state: "Karnataka",
        pincodeRanges: [
            { min: 560000, max: 562999 },   // Bangalore
            { min: 570000, max: 578999 }    // Other Karnataka regions
        ]
    },
    {
        state: "Kerala",
        pincodeRanges: [
            { min: 670001, max: 690599 }
        ]
    },
    {
        state: "Madhya Pradesh",
        pincodeRanges: [
            { min: 450001, max: 472999 }
        ]
    },
    {
        state: "Maharashtra",
        pincodeRanges: [
            { min: 400001, max: 421999 },   // Mumbai and Thane
            { min: 440001, max: 444999 }    // Nagpur
        ]
    },
    {
        state: "Manipur",
        pincodeRanges: [
            { min: 795001, max: 795999 }
        ]
    },
    {
        state: "Meghalaya",
        pincodeRanges: [
            { min: 793001, max: 794999 }
        ]
    },
    {
        state: "Mizoram",
        pincodeRanges: [
            { min: 796001, max: 796999 }
        ]
    },
    {
        state: "Nagaland",
        pincodeRanges: [
            { min: 797001, max: 797999 }
        ]
    },
    {
        state: "Odisha",
        pincodeRanges: [
            { min: 750001, max: 766999 }
        ]
    },
    {
        state: "Punjab",
        pincodeRanges: [
            { min: 140000, max: 160999 }
        ]
    },
    {
        state: "Rajasthan",
        pincodeRanges: [
            { min: 300000, max: 316999 }
        ]
    },
    {
        state: "Sikkim",
        pincodeRanges: [
            { min: 737101, max: 737199 }
        ]
    },
    {
        state: "Tamil Nadu",
        pincodeRanges: [
            { min: 600001, max: 604999 },   // Chennai
            { min: 620001, max: 628999 }    // Other Tamil Nadu regions
        ]
    },
    {
        state: "Telangana",
        pincodeRanges: [
            { min: 500001, max: 509999 }
        ]
    },
    {
        state: "Tripura",
        pincodeRanges: [
            { min: 799001, max: 799999 }
        ]
    },
    {
        state: "Uttar Pradesh",
        pincodeRanges: [
            { min: 200001, max: 277999 },   // Western UP
            { min: 280001, max: 299999 }    // Eastern UP
        ]
    },
    {
        state: "Uttarakhand",
        pincodeRanges: [
            { min: 240001, max: 249999 }
        ]
    },
    {
        state: "West Bengal",
        pincodeRanges: [
            { min: 700001, max: 711999 }    // Kolkata and surrounding areas
        ]
    },
    {
        state: "Andaman and Nicobar Islands",
        pincodeRanges: [
            { min: 744100, max: 744299 }
        ]
    },
    {
        state: "Chandigarh",
        pincodeRanges: [
            { min: 160001, max: 160099 }
        ]
    },
    {
        state: "Delhi",
        pincodeRanges: [
            { min: 110001, max: 110099 }
        ]
    },
    {
        state: "Jammu and Kashmir",
        pincodeRanges: [
            { min: 180001, max: 192999 }
        ]
    },
    {
        state: "Ladakh",
        pincodeRanges: [
            { min: 194101, max: 194199 }
        ]
    },
    {
        state: "Puducherry",
        pincodeRanges: [
            { min: 605001, max: 605009 }
        ]
    }
];


