"""Add research fields to patient and session models

Revision ID: 1a312fd0ba03
Revises: 1b34226120c5
Create Date: 2025-10-01 10:55:27.430372

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1a312fd0ba03'
down_revision: Union[str, None] = '1b34226120c5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add research fields to pt_patients table
    op.add_column('pt_patients', sa.Column('flooring_condition', sa.String(), nullable=True))
    op.add_column('pt_patients', sa.Column('cognitive_baseline', sa.JSON(), nullable=True))
    op.add_column('pt_patients', sa.Column('subject_notes', sa.Text(), nullable=True))

    # Add research fields to pt_sessions table
    op.add_column('pt_sessions', sa.Column('trial_number', sa.Integer(), nullable=True))
    op.add_column('pt_sessions', sa.Column('flooring_pattern', sa.String(), nullable=True))
    op.add_column('pt_sessions', sa.Column('environmental_notes', sa.Text(), nullable=True))

    # Add EEG data integration fields to pt_sessions
    op.add_column('pt_sessions', sa.Column('eeg_session_id', sa.String(), nullable=True))
    op.add_column('pt_sessions', sa.Column('eeg_avg_focus', sa.Float(), nullable=True))
    op.add_column('pt_sessions', sa.Column('eeg_avg_stress', sa.Float(), nullable=True))
    op.add_column('pt_sessions', sa.Column('eeg_avg_attention', sa.Float(), nullable=True))
    op.add_column('pt_sessions', sa.Column('eeg_avg_cognitive_load', sa.Float(), nullable=True))
    op.add_column('pt_sessions', sa.Column('eeg_contact_quality', sa.JSON(), nullable=True))
    op.add_column('pt_sessions', sa.Column('eeg_band_power_summary', sa.JSON(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    # Remove EEG fields from pt_sessions
    op.drop_column('pt_sessions', 'eeg_band_power_summary')
    op.drop_column('pt_sessions', 'eeg_contact_quality')
    op.drop_column('pt_sessions', 'eeg_avg_cognitive_load')
    op.drop_column('pt_sessions', 'eeg_avg_attention')
    op.drop_column('pt_sessions', 'eeg_avg_stress')
    op.drop_column('pt_sessions', 'eeg_avg_focus')
    op.drop_column('pt_sessions', 'eeg_session_id')

    # Remove research fields from pt_sessions
    op.drop_column('pt_sessions', 'environmental_notes')
    op.drop_column('pt_sessions', 'flooring_pattern')
    op.drop_column('pt_sessions', 'trial_number')

    # Remove research fields from pt_patients
    op.drop_column('pt_patients', 'subject_notes')
    op.drop_column('pt_patients', 'cognitive_baseline')
    op.drop_column('pt_patients', 'flooring_condition')
