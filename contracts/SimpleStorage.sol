// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

contract SimpleStorage {
    uint256 private _value;

    modifier infToTen(){
        require(_value < 10, "_value should be less than 10");
        _;
    }

    constructor(uint256 _initialValue) {
        _value = _initialValue;
    }

    event valueSet(uint256 _value);

    function setValue(uint newValue) public {
        _value = newValue;
        emit valueSet(_value);
    }

    function getValue() public view infToTen returns (uint256) {
        return _value;
    }

    function increment() public {
        _value++;
    }

    function getCurrentTime() public view returns(uint256) {
        return block.timestamp;
    }
}