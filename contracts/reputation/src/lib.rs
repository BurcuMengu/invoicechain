#![no_std]
#![allow(deprecated)]
mod types;
mod test;

use soroban_sdk::{contract, contractimpl, symbol_short, Address, Env};
use types::{DataKey, RepError, Score};

fn require_marketplace(env: &Env) {
    let mkt: Address = env.storage().instance().get(&DataKey::Marketplace).unwrap();
    mkt.require_auth();
}

fn read_score(env: &Env, party: &Address) -> Score {
    env.storage()
        .persistent()
        .get(&DataKey::Score(party.clone()))
        .unwrap_or(Score { settled_count: 0, defaulted_count: 0, volume: 0 })
}

#[contract]
pub struct Reputation;

#[contractimpl]
impl Reputation {
    pub fn __constructor(env: Env, marketplace: Address) {
        if env.storage().instance().has(&DataKey::Marketplace) {
            panic_with_error(&env, RepError::AlreadyInitialized);
        }
        env.storage().instance().set(&DataKey::Marketplace, &marketplace);
    }

    pub fn record_settled(env: Env, party: Address, amount: i128) {
        require_marketplace(&env);
        let mut s = read_score(&env, &party);
        s.settled_count += 1;
        s.volume += amount;
        env.storage().persistent().set(&DataKey::Score(party.clone()), &s);
        env.events().publish((symbol_short!("rep_up"), party), s.settled_count);
    }

    pub fn record_defaulted(env: Env, party: Address) {
        require_marketplace(&env);
        let mut s = read_score(&env, &party);
        s.defaulted_count += 1;
        env.storage().persistent().set(&DataKey::Score(party.clone()), &s);
        env.events().publish((symbol_short!("rep_down"), party), s.defaulted_count);
    }

    pub fn get_score(env: Env, party: Address) -> Score {
        read_score(&env, &party)
    }
}

fn panic_with_error(env: &Env, e: RepError) -> ! {
    soroban_sdk::panic_with_error!(env, e)
}
