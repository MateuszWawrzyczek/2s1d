"""merge categories and item_status

Revision ID: 199c025a96c9
Revises: a1b2c3d4e5f6, fc199d7fd0aa
Create Date: 2026-05-28 19:10:04.507377

"""

from typing import Sequence, Union

# revision identifiers, used by Alembic.
revision: str = "199c025a96c9"
down_revision: Union[str, Sequence[str], None] = ("a1b2c3d4e5f6", "fc199d7fd0aa")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
