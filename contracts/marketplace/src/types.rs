use soroban_sdk::{contracterror, contracttype, Address, String};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum Status {
    Listed,
    Funded,
    Settled,
    Defaulted,
    Cancelled,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Invoice {
    pub id: u64,
    pub seller: Address,
    pub debtor_name: String,
    pub face_value: i128,
    pub discount_bps: u32,
    pub due_ledger: u64,
    pub owner: Address,
    pub status: Status,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Token,
    Reputation,
    NextId,
    Invoice(u64),
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum MarketError {
    AlreadyInitialized = 1,
    ZeroAmount = 2,
    InvalidDiscount = 3,
    DueInPast = 4,
    NotFound = 5,
    NotListed = 6,
    NotFunded = 7,
    NotSeller = 8,
    NotDueYet = 9,
}

pub fn sale_price(face_value: i128, discount_bps: u32) -> i128 {
    face_value * (10000 - discount_bps as i128) / 10000
}
