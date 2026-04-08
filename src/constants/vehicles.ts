export const VEHICLE_DATA = {
  car: {
    "Honda": ["Civic", "Civic SI", "City", "Fit", "HR-V", "Accord"],
    "Volkswagen": ["Gol", "Golf", "Golf GTI", "Polo", "Jetta", "Jetta GLI", "Virtus", "T-Cross", "Amarok", "Passat"],
    "Chevrolet": ["Onix", "Cruze", "Camaro", "Corvette", "Tracker", "S10", "Opala", "Astra", "Vectra"],
    "Toyota": ["Corolla", "Corolla GR", "Hilux", "Yaris", "SW4", "Supra"],
    "Ford": ["Mustang", "Focus", "Fiesta", "Ranger", "Fusion", "Ka"],
    "BMW": ["M3", "M5", "320i", "330i", "X1", "X3", "X5", "M2", "M4"],
    "Audi": ["A3", "A4", "A5", "RS3", "RS5", "RS6", "Q3", "Q5", "TT"],
    "Mercedes-Benz": ["C63 AMG", "A45 AMG", "C180", "C200", "E63 AMG", "G63 AMG"],
    "Hyundai": ["HB20", "i30", "i30N", "Creta", "Tucson", "Veloster"],
    "Fiat": ["Uno", "Palio", "Marea", "Pulse", "Fastback", "Toro", "Argo"],
    "Renault": ["Sandero RS", "Sandero", "Logan", "Duster", "Fluence", "Megane"],
    "Mitsubishi": ["Lancer Evolution", "Lancer", "L200", "Eclipse", "Pajero"],
    "Subaru": ["WRX STI", "WRX", "Impreza", "Forester"],
    "Nissan": ["GT-R", "370Z", "350Z", "Sentra", "Frontier", "Kicks"],
    "Porsche": ["911 Carrera", "911 Turbo", "718 Cayman", "Taycan", "Panamera", "Macan"],
    "Ferrari": ["458 Italia", "488 GTB", "F8 Tributo", "SF90"],
    "Lamborghini": ["Aventador", "Huracan", "Urus"]
  },
  motorcycle: {
    "Honda": ["CB 600F Hornet", "CB 1000R", "CBR 600RR", "CBR 1000RR-R", "CB 500F", "XRE 300", "CG 160 Titan", "Africa Twin"],
    "Yamaha": ["MT-03", "MT-07", "MT-09", "YZF-R3", "YZF-R1", "YZF-R6", "XJ6", "Fazer 250"],
    "Kawasaki": ["Z900", "Z1000", "Ninja 400", "Ninja ZX-6R", "Ninja ZX-10R", "Ninja H2", "Z400"],
    "BMW": ["S1000RR", "R1250GS", "F850GS", "G310R", "S1000R"],
    "Suzuki": ["GSX-R1000", "Hayabusa", "GSX-S750", "GSX-S1000", "V-Strom 650"],
    "Ducati": ["Panigale V4", "Monster", "Diavel", "Multistrada", "Streetfighter V4"],
    "Triumph": ["Street Triple", "Speed Triple", "Tiger 900", "Tiger 1200", "Daytona 675"],
    "KTM": ["Duke 390", "Duke 890", "Super Duke 1290", "RC 390"]
  }
};

export const YEARS = Array.from({ length: 50 }, (_, i) => (new Date().getFullYear() - i).toString());
