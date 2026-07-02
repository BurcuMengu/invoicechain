#![cfg(test)]
use crate::{types::Status, Marketplace, MarketplaceClient};
use soroban_sdk::{testutils::{Address as _, Ledger as _}, Address, Env, String};

/// Setup stores owned values only — no borrowing client.
/// MarketplaceClient<'a> borrows Env so it cannot be stored alongside it
/// in the same struct (self-referential). Clients are constructed on demand
/// inside each test via `MarketplaceClient::new(&s.env, &s.market_id)`.
#[allow(dead_code)]
pub struct Setup {
    pub env: Env,
    pub market_id: Address,
    pub token_id: Address,
    pub rep_id: Address,
}

pub fn setup() -> Setup {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_sequence_number(100);

    let admin = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let token_id = env.register(
        test_token::TestToken,
        (token_admin, 7u32, String::from_str(&env, "USD Coin"), String::from_str(&env, "USDC")),
    );

    // Constructor cycle resolution:
    // 1. Register marketplace with token_id as a placeholder reputation address.
    // 2. Register reputation pointing at the real market_id.
    // 3. Call market.set_reputation(&rep_id) to fix the pointer.
    let market_id = env.register(
        Marketplace,
        (admin.clone(), token_id.clone(), token_id.clone()), // placeholder rep = token_id
    );
    let rep_id = env.register(reputation::Reputation, (market_id.clone(),));
    let market = MarketplaceClient::new(&env, &market_id);
    market.set_reputation(&rep_id);

    Setup { env, market_id, token_id, rep_id }
}

#[test]
fn create_invoice_stores_listed() {
    let s = setup();
    let market = MarketplaceClient::new(&s.env, &s.market_id);
    let seller = Address::generate(&s.env);
    let id = market.create_invoice(
        &seller,
        &String::from_str(&s.env, "ACME Corp"),
        &1_000_000_000i128, // 100 USDC face
        &500u64,            // due ledger
        &1000u32,           // 10% discount
    );
    let inv = market.get_invoice(&id);
    assert_eq!(inv.status, Status::Listed);
    assert_eq!(inv.seller, seller);
    assert_eq!(inv.face_value, 1_000_000_000i128);
    assert_eq!(inv.owner, seller);
}
