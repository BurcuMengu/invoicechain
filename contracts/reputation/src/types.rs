use soroban_sdk::{contracterror, contracttype, Address};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Score {
    pub settled_count: u32,
    pub defaulted_count: u32,
    pub volume: i128,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Marketplace,
    Score(Address),
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum RepError {
    AlreadyInitialized = 1,
    Unauthorized = 2,
}
