// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract RiskOracle {
    mapping(address => uint256) public riskScores;

    event RiskScoreUpdated(address indexed msme, uint256 score);

    function getRiskScore(address msme) external view returns (uint256) {
        return riskScores[msme];
    }

    function updateRiskScore(address msme, uint256 score) external {
        riskScores[msme] = score;
        emit RiskScoreUpdated(msme, score);
    }
}