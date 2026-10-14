/**
 * Value object Money : un montant en euros, stocké en CENTIMES entiers.
 * Les calculs en centimes évitent les erreurs des nombres à virgule (0,1 + 0,2 !== 0,3).
 * Immuable : chaque opération renvoie un nouveau Money.
 */
export class Money {
	private constructor(readonly cents: number) {}

	static euros(amount: number): Money {
		return new Money(Math.round(amount * 100));
	}

	/** Reconstruit un montant à partir de centimes (lecture en base de données). */
	static cents(amount: number): Money {
		if (!Number.isInteger(amount))
			throw new RangeError(`Un montant en centimes doit être entier : ${amount}`);
		return new Money(amount);
	}

	static zero(): Money {
		return new Money(0);
	}

	add(other: Money): Money {
		return new Money(this.cents + other.cents);
	}

	subtract(other: Money): Money {
		return new Money(this.cents - other.cents);
	}

	/** Multiplie le montant (majorations : ×1,5, ×2…) et arrondit au centime. */
	multiply(factor: number): Money {
		return new Money(Math.round(this.cents * factor));
	}

	isGreaterThanOrEqual(other: Money): boolean {
		return this.cents >= other.cents;
	}

	equals(other: Money): boolean {
		return this.cents === other.cents;
	}

	toEuros(): number {
		return this.cents / 100;
	}
}
