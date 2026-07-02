#![cfg(test)]
use crate::{types::Score, Reputation, ReputationClient};
use soroban_sdk::{testutils::Address as _, Address, Env};

fn setup(env: &Env) -> (Address, ReputationClient<'_>) {
    let marketplace = Address::generate(env);
    let id = env.register(Reputation, (marketplace.clone(),));
    (marketplace, ReputationClient::new(env, &id))
}

#[test]
fn records_settled_and_defaulted() {
    let env = Env::default();
    env.mock_all_auths();
    let (_mkt, rep) = setup(&env);
    let party = Address::generate(&env);

    rep.record_settled(&party, &500i128);
    rep.record_settled(&party, &300i128);
    rep.record_defaulted(&party);

    let s: Score = rep.get_score(&party);
    assert_eq!(s.settled_count, 2);
    assert_eq!(s.defaulted_count, 1);
    assert_eq!(s.volume, 800);
}

#[test]
fn unknown_party_scores_zero() {
    let env = Env::default();
    let (_mkt, rep) = setup(&env);
    let s = rep.get_score(&Address::generate(&env));
    assert_eq!(s, Score { settled_count: 0, defaulted_count: 0, volume: 0 });
}
