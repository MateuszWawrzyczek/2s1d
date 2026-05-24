"""init

Revision ID: e14605ffb8eb
Revises:
Create Date: 2026-05-18 20:57:08.752063

"""

from typing import Sequence, Union

# revision identifiers, used by Alembic.
revision: str = "e14605ffb8eb"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
